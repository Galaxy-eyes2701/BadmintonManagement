using Microsoft.EntityFrameworkCore;
using backend.DTOs;
using backend.Models;
using backend.Interface.Service;

namespace backend.Services
{
    public class BookingService : IBookingService
    {
        private readonly BadmintonManagementContext _db;

        public BookingService(BadmintonManagementContext db)
        {
            _db = db;
        }

        // ── 1. Lấy sân trống theo ngày ──────────────────────────────────────
        public async Task<List<AvailableCourtDto>> GetAvailableCourtsAsync(
            DateTime date, int? branchId, int? courtTypeId)
        {
            int dayOfWeek = (int)date.DayOfWeek; // 0=Sun … 6=Sat

            // Lấy tất cả booking detail đã confirmed trong ngày đó
            var bookedSlots = await _db.BookingDetails
                .Include(bd => bd.Booking)
                .Where(bd => bd.PlayDate == DateOnly.FromDateTime(date)
                          && bd.Booking.Status != "cancelled")
                .Select(bd => new { bd.CourtId, bd.TimeSlotId })
                .ToListAsync();

            var bookedSet = bookedSlots
                .Select(b => (b.CourtId, b.TimeSlotId))
                .ToHashSet();

            // Lấy lịch cố định trùng ngày
            var fixedSlots = await _db.FixedSchedules
                .Where(fs => fs.DayOfWeek == dayOfWeek
                          && fs.StartDate <= DateOnly.FromDateTime(date)
                          && fs.EndDate >= DateOnly.FromDateTime(date))
                .Select(fs => new { fs.CourtId, fs.TimeSlotId })
                .ToListAsync();

            var fixedSet = fixedSlots
                .Select(f => (f.CourtId, f.TimeSlotId))
                .ToHashSet();

            // Query courts
            var courtQuery = _db.Courts
                .Include(c => c.Branch)
                .Include(c => c.CourtType)
                .Where(c => c.Status == "active");

            if (branchId.HasValue)
                courtQuery = courtQuery.Where(c => c.BranchId == branchId.Value);
            if (courtTypeId.HasValue)
                courtQuery = courtQuery.Where(c => c.CourtTypeId == courtTypeId.Value);

            var courts = await courtQuery.ToListAsync();

            // Prices
            var prices = await _db.PriceConfigs
                .Where(p => p.DayOfWeek == dayOfWeek)
                .ToListAsync();

            var timeSlots = await _db.TimeSlots.OrderBy(t => t.StartTime).ToListAsync();

            var result = courts.Select(court =>
            {
                var slots = timeSlots.Select(ts =>
                {
                    var price = prices.FirstOrDefault(p =>
                        p.CourtTypeId == court.CourtTypeId && p.TimeSlotId == ts.Id);

                    bool isTaken = bookedSet.Contains((court.Id, ts.Id))
                                || fixedSet.Contains((court.Id, ts.Id));

                    return new AvailableSlotDto
                    {
                        TimeSlotId = ts.Id,
                        StartTime = ts.StartTime.ToString(@"HH\:mm"),
                        EndTime = ts.EndTime.ToString(@"HH\:mm"),
                        Price = price?.Price ?? 0,
                        IsAvailable = !isTaken && (price?.Price ?? 0) > 0
                    };
                }).ToList();

                return new AvailableCourtDto
                {
                    CourtId = court.Id,
                    CourtName = court.Name,
                    CourtType = court.CourtType.Name,
                    BranchId = court.BranchId,
                    BranchName = court.Branch.Name,
                    BranchAddress = court.Branch.Address ?? "",
                    AvailableSlots = slots
                };
            }).ToList();

            return result;
        }

        // ── 2. Tạo booking ──────────────────────────────────────────────────
        public async Task<BookingResponseDto> CreateBookingAsync(int userId, CreateBookingDto dto)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                // Validate slots còn trống
                foreach (var slot in dto.Slots)
                {
                    var date = DateOnly.FromDateTime(slot.PlayDate);
                    bool conflict = await _db.BookingDetails
                        .Include(bd => bd.Booking)
                        .AnyAsync(bd => bd.CourtId == slot.CourtId
                                     && bd.TimeSlotId == slot.TimeSlotId
                                     && bd.PlayDate == date
                                     && bd.Booking.Status != "cancelled");

                    if (conflict)
                        throw new InvalidOperationException(
                            $"Slot đã được đặt: CourtId={slot.CourtId}, TimeSlotId={slot.TimeSlotId}, Date={date}");
                }

                // Tính giá cho từng slot
                decimal subTotal = 0;
                var detailItems = new List<(BookingSlotDto slot, decimal price, Court court, TimeSlot ts)>();

                foreach (var slot in dto.Slots)
                {
                    var date = DateOnly.FromDateTime(slot.PlayDate);
                    int dow = (int)slot.PlayDate.DayOfWeek;

                    var court = await _db.Courts
                        .Include(c => c.CourtType)
                        .Include(c => c.Branch)
                        .FirstOrDefaultAsync(c => c.Id == slot.CourtId)
                        ?? throw new Exception($"Không tìm thấy sân Id={slot.CourtId}");

                    var ts = await _db.TimeSlots.FindAsync(slot.TimeSlotId)
                        ?? throw new Exception($"Không tìm thấy time slot Id={slot.TimeSlotId}");

                    var priceConfig = await _db.PriceConfigs
                        .FirstOrDefaultAsync(p => p.CourtTypeId == court.CourtTypeId
                                               && p.TimeSlotId == slot.TimeSlotId
                                               && p.DayOfWeek == dow)
                        ?? throw new Exception("Không có cấu hình giá cho slot này");

                    subTotal += priceConfig.Price;
                    detailItems.Add((slot, priceConfig.Price, court, ts));
                }

                // Áp dụng voucher
                decimal discount = 0;
                string? voucherApplied = null;
                if (!string.IsNullOrWhiteSpace(dto.VoucherCode))
                {
                    var voucher = await _db.Vouchers
                        .FirstOrDefaultAsync(v => v.Code == dto.VoucherCode
                                               && v.ExpiryDate >= DateOnly.FromDateTime(DateTime.Today)
                                               && v.UsageLimit > 0);
                    if (voucher != null)
                    {
                        discount = Math.Min(voucher.DiscountAmount, subTotal);
                        voucher.UsageLimit--;
                        voucherApplied = voucher.Code;
                    }
                }

                decimal totalPrice = subTotal - discount;

                // Tạo booking
                var booking = new Booking
                {
                    UserId = userId,
                    CreatedAt = DateTime.Now,
                    TotalPrice = totalPrice,
                    Status = "pending"
                };
                _db.Bookings.Add(booking);
                await _db.SaveChangesAsync();

                // Tạo booking details
                foreach (var (slot, price, court, ts) in detailItems)
                {
                    _db.BookingDetails.Add(new BookingDetail
                    {
                        BookingId = booking.Id,
                        CourtId = slot.CourtId,
                        TimeSlotId = slot.TimeSlotId,
                        PlayDate = DateOnly.FromDateTime(slot.PlayDate),
                        PriceSnapshot = price
                    });
                }

                // Tạo payment
                var payment = new Payment
                {
                    BookingId = booking.Id,
                    Amount = totalPrice,
                    PaymentMethod = dto.PaymentMethod,
                    Status = "pending",
                    CreatedAt = DateTime.Now
                };
                _db.Payments.Add(payment);

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                // Build response
                var detailDtos = detailItems.Select(x => new BookingDetailItemDto
                {
                    Id = 0,
                    CourtName = x.court.Name,
                    BranchName = x.court.Branch.Name,
                    CourtType = x.court.CourtType.Name,
                    TimeSlot = $"{x.ts.StartTime:hh\\:mm} - {x.ts.EndTime:hh\\:mm}",
                    PlayDate = x.slot.PlayDate.ToString("dd/MM/yyyy"),
                    Price = x.price
                }).ToList();

                return new BookingResponseDto
                {
                    BookingId = booking.Id,
                    SubTotal = subTotal,
                    Discount = discount,
                    TotalPrice = totalPrice,
                    Status = booking.Status,
                    CreatedAt = booking.CreatedAt ?? DateTime.Now,
                    VoucherApplied = voucherApplied,
                    Details = detailDtos,
                    Payment = new PaymentInfoDto
                    {
                        PaymentId = payment.Id,
                        Method = payment.PaymentMethod,
                        Status = payment.Status,
                        Amount = payment.Amount,
                        CreatedAt = payment.CreatedAt ?? DateTime.Now
                    }
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ── 3. Hủy booking ──────────────────────────────────────────────────
        public async Task<bool> CancelBookingAsync(int bookingId, int userId)
        {
            var booking = await _db.Bookings
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);

            if (booking == null) return false;
            if (booking.Status == "cancelled") return false;

            // Chỉ hủy nếu chưa thanh toán thành công
            bool paid = booking.Payments.Any(p => p.Status == "success");
            if (paid) return false;

            booking.Status = "cancelled";
            foreach (var payment in booking.Payments)
                if (payment.Status == "pending")
                    payment.Status = "cancelled";

            await _db.SaveChangesAsync();
            return true;
        }

        // ── 4. Lịch sử booking của user ─────────────────────────────────────
        public async Task<List<BookingHistoryDto>> GetUserBookingsAsync(int userId)
        {
            var bookings = await _db.Bookings
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Court).ThenInclude(c => c.Branch)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .Include(b => b.Payments)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return bookings.Select(b =>
            {
                var firstDetail = b.BookingDetails.OrderBy(d => d.PlayDate).FirstOrDefault();
                var lastPayment = b.Payments.OrderByDescending(p => p.CreatedAt).FirstOrDefault();

                return new BookingHistoryDto
                {
                    BookingId = b.Id,
                    CreatedAt = b.CreatedAt ?? DateTime.Now,
                    TotalPrice = b.TotalPrice ?? 0,
                    Status = b.Status,
                    PaymentStatus = lastPayment?.Status ?? "none",
                    PaymentMethod = lastPayment?.PaymentMethod ?? "",
                    SlotCount = b.BookingDetails.Count,
                    FirstCourtName = firstDetail?.Court.Name ?? "",
                    FirstBranchName = firstDetail?.Court.Branch.Name ?? "",
                    FirstPlayDate = firstDetail?.PlayDate.ToString("dd/MM/yyyy") ?? ""
                };
            }).ToList();
        }

        // ── 5. Chi tiết booking ─────────────────────────────────────────────
        public async Task<BookingDetailResponseDto?> GetBookingByIdAsync(int bookingId, int userId)
        {
            var booking = await _db.Bookings
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Court).ThenInclude(c => c.Branch)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Court).ThenInclude(c => c.CourtType)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);

            if (booking == null) return null;

            var lastPayment = booking.Payments.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
            bool paid = booking.Payments.Any(p => p.Status == "success");

            return new BookingDetailResponseDto
            {
                BookingId = booking.Id,
                CreatedAt = booking.CreatedAt ?? DateTime.Now,
                TotalPrice = booking.TotalPrice ?? 0,
                Status = booking.Status,
                CanCancel = !paid && booking.Status != "cancelled",
                Details = booking.BookingDetails.Select(bd => new BookingDetailItemDto
                {
                    Id = bd.Id,
                    CourtName = bd.Court.Name,
                    BranchName = bd.Court.Branch.Name,
                    CourtType = bd.Court.CourtType.Name,
                    TimeSlot = $"{bd.TimeSlot.StartTime:hh\\:mm} - {bd.TimeSlot.EndTime:hh\\:mm}",
                    PlayDate = bd.PlayDate.ToString("dd/MM/yyyy"),
                    Price = bd.PriceSnapshot
                }).ToList(),
                Payment = lastPayment == null ? null : new PaymentInfoDto
                {
                    PaymentId = lastPayment.Id,
                    Method = lastPayment.PaymentMethod,
                    Status = lastPayment.Status,
                    Amount = lastPayment.Amount,
                    CreatedAt = lastPayment.CreatedAt ?? DateTime.Now
                }
            };
        }

        // ── 6. Hồ sơ user ───────────────────────────────────────────────────
        public async Task<UserProfileDto> GetUserProfileAsync(int userId)
        {
            var user = await _db.Users.FindAsync(userId)
                ?? throw new Exception("User không tồn tại");

            var bookings = await _db.Bookings
                .Where(b => b.UserId == userId)
                .ToListAsync();

            return new UserProfileDto
            {
                UserId = user.Id,
                FullName = user.FullName,
                Phone = user.Phone,
                Email = user.Email,
                LoyaltyPoints = user.LoyaltyPoints ?? 0,
                Status = user.Status,
                Role = user.Role,
                TotalBookings = bookings.Count,
                CompletedBookings = bookings.Count(b => b.Status == "confirmed"),
                TotalSpent = bookings
                    .Where(b => b.Status == "confirmed")
                    .Sum(b => b.TotalPrice ?? 0)
            };
        }

        // ── 7. Validate voucher ──────────────────────────────────────────────
        public async Task<VoucherValidationDto> ValidateVoucherAsync(string code, decimal totalAmount)
        {
            var voucher = await _db.Vouchers
                .FirstOrDefaultAsync(v => v.Code == code);

            if (voucher == null)
                return new VoucherValidationDto { IsValid = false, Message = "Mã voucher không tồn tại" };

            if (voucher.ExpiryDate < DateOnly.FromDateTime(DateTime.Today))
                return new VoucherValidationDto { IsValid = false, Message = "Mã voucher đã hết hạn" };

            if (voucher.UsageLimit <= 0)
                return new VoucherValidationDto { IsValid = false, Message = "Mã voucher đã hết lượt sử dụng" };

            var discount = Math.Min(voucher.DiscountAmount, totalAmount);
            return new VoucherValidationDto
            {
                IsValid = true,
                Message = $"Áp dụng thành công! Giảm {discount:N0}đ",
                DiscountAmount = discount,
                Code = voucher.Code
            };
        }

        // ── 8. Đơn hàng của user ────────────────────────────────────────────
        public async Task<List<UserOrderDto>> GetUserOrdersAsync(int userId)
        {
            // Lấy booking IDs của user
            var userBookingIds = await _db.Bookings
                .Where(b => b.UserId == userId)
                .Select(b => b.Id)
                .ToListAsync();

            // Chỉ lấy orders liên kết với bookings của user
            // (Không lấy orders có BookingId = null vì không xác định được chủ sở hữu)
            var orders = await _db.Orders
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                    .ThenInclude(p => p.Category)
                .Where(o => o.BookingId != null && userBookingIds.Contains(o.BookingId.Value))
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(o => new UserOrderDto
            {
                OrderId = o.Id,
                CreatedAt = o.CreatedAt,
                TotalAmount = o.TotalAmount,
                BookingId = o.BookingId,
                Items = o.OrderDetails.Select(od => new OrderDetailItemDto
                {
                    ProductName = od.Product.Name,
                    Category = od.Product.Category.Name,
                    Quantity = od.Quantity,
                    UnitPrice = od.UnitPriceSnapshot,
                    SubTotal = od.Quantity * od.UnitPriceSnapshot
                }).ToList()
            }).ToList();
        }
    }
}