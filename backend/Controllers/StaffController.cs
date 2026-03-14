using backend.DTOs.Staff;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StaffController : ControllerBase
    {
        private readonly BadmintonManagementContext _context;
        private readonly EmailService _emailService;
        private readonly IPasswordService _passwordService;

        public StaffController(
            BadmintonManagementContext context,
            EmailService emailService,
            IPasswordService passwordService)
        {
            _context = context;
            _emailService = emailService;
            _passwordService = passwordService;
        }

        // =======================================================
        // 1. API LẤY CHI TIẾT HÓA ĐƠN TRƯỚC KHI TẤT TOÁN 
        // =======================================================
        [HttpGet("booking-bill/{bookingId}")]
        public async Task<IActionResult> GetBookingBill(int bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.User).Include(b => b.Orders).Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return NotFound("Không tìm thấy Booking");

            decimal courtTotal = booking.TotalPrice ?? 0;
            decimal posTotal = booking.Orders.Sum(o => o.TotalAmount);
            decimal alreadyPaid = booking.Payments.Where(p => p.Status == "success").Sum(p => p.Amount);

            // FIX LỖI 2: Nếu đơn đã hoàn tất thì tiền nợ ép bằng 0 luôn, khỏi tính toán lằng nhằng
            decimal remainingAmount = 0;
            if (booking.Status != "completed")
            {
                remainingAmount = (courtTotal + posTotal) - alreadyPaid;
                if (remainingAmount < 0) remainingAmount = 0;
            }

            var availableVouchers = await _context.Vouchers
                .Where(v => v.UsageLimit > 0 && v.ExpiryDate >= DateOnly.FromDateTime(DateTime.Now))
                .Select(v => new { code = v.Code, discountAmount = v.DiscountAmount, label = $"{v.Code} (Giảm {v.DiscountAmount:N0}đ)" })
                .ToListAsync();

            return Ok(new
            {
                bookingId = booking.Id,
                customerName = booking.User?.FullName ?? "Khách vãng lai",
                loyaltyPoints = booking.User?.LoyaltyPoints ?? 0,
                courtTotal,
                posTotal,
                alreadyPaid,
                remainingAmount,
                availableVouchers
            });
        }

        // =======================================================
        // TÍNH NĂNG MỚI: API GIA HẠN CA TIẾP THEO
        // =======================================================
        [HttpPost("extend-booking/{bookingId}")]
        public async Task<IActionResult> ExtendBooking(int bookingId, [FromQuery] int courtId, [FromQuery] int nextSlotId)
        {
            var booking = await _context.Bookings.FindAsync(bookingId);
            if (booking == null) return NotFound("Không tìm thấy đơn.");
            if (booking.Status == "completed") return BadRequest("Đơn đã thanh toán, không thể gia hạn.");

            // Kiểm tra xem ca sau có bị ai hớt tay trên chưa
            var today = DateOnly.FromDateTime(DateTime.Now);
            var isBooked = await _context.BookingDetails.AnyAsync(bd => bd.CourtId == courtId && bd.TimeSlotId == nextSlotId && bd.PlayDate == today && bd.Booking.Status != "cancelled");
            if (isBooked) return BadRequest("Ca tiếp theo đã có người khác đặt mất rồi!");

            // Lấy giá của ca cũ để chép sang ca mới
            var prevDetail = await _context.BookingDetails.FirstOrDefaultAsync(bd => bd.BookingId == bookingId && bd.CourtId == courtId);
            decimal price = prevDetail != null ? prevDetail.PriceSnapshot : 50000;

            // Ghi thêm 1 bản ghi vào sân ca sau (cùng mã Booking cũ)
            var newDetail = new BookingDetail { BookingId = bookingId, CourtId = courtId, TimeSlotId = nextSlotId, PlayDate = today, PriceSnapshot = price };
            _context.BookingDetails.Add(newDetail);

            // Cộng dồn tiền vào tổng bill
            booking.TotalPrice = (booking.TotalPrice ?? 0) + price;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Gia hạn thành công! Hệ thống đã khóa ca tiếp theo cho khách." });
        }
        // =======================================================
        // 2. THANH TOÁN (CHECKOUT) & TRỪ VOUCHER, CỘNG ĐIỂM
        // =======================================================
        [HttpPost("checkout/{bookingId}")]
        public async Task<IActionResult> CheckoutBooking(int bookingId, [FromBody] CheckoutDto dto)
        {
            var booking = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Orders)
                .Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return NotFound("Không tìm thấy Booking");
            if (booking.Status == "completed") return BadRequest("Đơn này đã được thanh toán rồi!");

            decimal courtTotal = booking.TotalPrice ?? 0;
            decimal posTotal = booking.Orders.Sum(o => o.TotalAmount);
            decimal alreadyPaid = booking.Payments.Where(p => p.Status == "success").Sum(p => p.Amount);

            decimal discountAmount = 0;

            // KIỂM TRA MÃ VOUCHER NẾU LỄ TÂN CÓ CHỌN
            if (!string.IsNullOrEmpty(dto.VoucherCode))
            {
                var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == dto.VoucherCode);

                if (voucher == null) return BadRequest("Mã Voucher không tồn tại!");
                if (voucher.ExpiryDate < DateOnly.FromDateTime(DateTime.Now)) return BadRequest("Mã Voucher đã hết hạn!");
                if (voucher.UsageLimit <= 0) return BadRequest("Mã Voucher đã hết lượt sử dụng!");

                discountAmount = voucher.DiscountAmount;
                voucher.UsageLimit -= 1; // Trừ 1 lượt sử dụng
            }

            decimal remainingAmount = (courtTotal + posTotal) - discountAmount - alreadyPaid;
            if (remainingAmount < 0) remainingAmount = 0;

            if (remainingAmount > 0)
            {
                _context.Payments.Add(new Payment
                {
                    BookingId = booking.Id,
                    Amount = remainingAmount,
                    PaymentMethod = dto.PaymentMethod,
                    Status = "success",
                    CreatedAt = DateTime.Now
                });
            }

            booking.Status = "completed";

            // TÍCH ĐIỂM DỰA TRÊN TIỀN THỰC TRẢ
            int pointsEarned = 0;
            if (booking.User != null && booking.User.Role == "Customer")
            {
                decimal actualPaid = (courtTotal + posTotal) - discountAmount;
                if (actualPaid > 0)
                {
                    pointsEarned = (int)(actualPaid / 10000);
                    booking.User.LoyaltyPoints = (booking.User.LoyaltyPoints ?? 0) + pointsEarned;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Thanh toán thành công! Khách được cộng {pointsEarned} điểm.",
                pointsAdded = pointsEarned
            });
        }

        // =======================================================
        // 3. LẤY DANH SÁCH SÂN ĐANG ĐÁ HÔM NAY (CHO MÁY POS)
        // =======================================================
        [HttpGet("active-bookings")]
        public async Task<IActionResult> GetActiveBookings()
        {
            var today = DateOnly.FromDateTime(DateTime.Now);

            var bookings = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Court)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TimeSlot)
                .Where(b => b.Status == "confirmed")
                .Where(b => b.BookingDetails.Any(bd => bd.PlayDate == today))
                .Select(b => new
                {
                    id = b.Id,
                    customerName = b.User != null ? b.User.FullName : "Khách vãng lai",
                    courtName = b.BookingDetails.FirstOrDefault().Court.Name,
                    time = b.BookingDetails.FirstOrDefault().TimeSlot != null
                           ? $"{b.BookingDetails.FirstOrDefault().TimeSlot.StartTime:HH\\:mm} - {b.BookingDetails.FirstOrDefault().TimeSlot.EndTime:HH\\:mm}"
                           : ""
                })
                .ToListAsync();

            return Ok(bookings);
        }

        // =======================================================
        // 4. QUẢN LÝ LỊCH SÂN THEO NGÀY (MÀN HÌNH CHÍNH)
        // =======================================================
        [HttpGet("daily-schedule")]
        public async Task<IActionResult> GetDailySchedule([FromQuery] string date)
        {
            if (!DateOnly.TryParse(date, out DateOnly targetDate))
                return BadRequest("Định dạng ngày không hợp lệ.");

            var courts = await _context.Courts.OrderBy(c => c.Name).ToListAsync();
            var timeSlots = await _context.TimeSlots.OrderBy(t => t.StartTime).ToListAsync();

            var bookingsForDay = await _context.BookingDetails
                .Include(bd => bd.Booking).ThenInclude(b => b.User)
                .Where(bd => bd.PlayDate == targetDate && bd.Booking.Status != "cancelled")
                .ToListAsync();

            var result = courts.Select(court => new
            {
                courtId = court.Id,
                courtName = court.Name,
                status = court.Status,
                schedule = timeSlots.Select(slot =>
                {
                    var bookedDetail = bookingsForDay.FirstOrDefault(b => b.CourtId == court.Id && b.TimeSlotId == slot.Id);
                    return new
                    {
                        timeSlotId = slot.Id,
                        time = $"{slot.StartTime:HH\\:mm} - {slot.EndTime:HH\\:mm}",
                        isBooked = bookedDetail != null,
                        bookingInfo = bookedDetail != null ? new
                        {
                            bookingId = bookedDetail.BookingId,
                            customerName = bookedDetail.Booking.User.FullName,
                            phone = bookedDetail.Booking.User.Phone,
                            paymentStatus = bookedDetail.Booking.Status
                        } : null
                    };
                })
            });

            return Ok(result);
        }

        [HttpPut("toggle-court-status/{courtId}")]
        public async Task<IActionResult> ToggleCourtStatus(int courtId, [FromBody] string status)
        {
            var court = await _context.Courts.FindAsync(courtId);
            if (court == null) return NotFound("Không tìm thấy sân");
            court.Status = status;
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã cập nhật trạng thái thành {status}" });
        }

        // =======================================================
        // 5. QUẢN LÝ HỢP ĐỒNG CỐ ĐỊNH (KHÁCH RUỘT) & EMAIL
        // =======================================================
        [HttpGet("setup-data")]
        public async Task<IActionResult> GetSetupData()
        {
            var customers = await _context.Users.Where(u => u.Role == "Customer").Select(u => new { u.Id, u.FullName, u.Phone }).ToListAsync();
            var courts = await _context.Courts.Select(c => new { c.Id, c.Name }).ToListAsync();
            var timeSlots = await _context.TimeSlots.Select(t => new { t.Id, time = $"{t.StartTime:HH\\:mm} - {t.EndTime:HH\\:mm}" }).ToListAsync();
            return Ok(new { customers, courts, timeSlots });
        }

        [HttpGet("fixed-schedules")]
        public async Task<IActionResult> GetFixedSchedules()
        {
            var query = from fs in _context.FixedSchedules
                        join u in _context.Users on fs.UserId equals u.Id into userGroup
                        from u in userGroup.DefaultIfEmpty()
                        join c in _context.Courts on fs.CourtId equals c.Id into courtGroup
                        from c in courtGroup.DefaultIfEmpty()
                        join t in _context.TimeSlots on fs.TimeSlotId equals t.Id into timeGroup
                        from t in timeGroup.DefaultIfEmpty()
                        select new { fs, u, c, t };

            var schedules = await query.ToListAsync();
            var today = DateOnly.FromDateTime(DateTime.Now);

            var result = schedules.Select(x => new
            {
                id = x.fs.Id,
                teamName = x.u?.FullName ?? "Khách hàng",
                phone = x.u?.Phone ?? "N/A",
                courtName = x.c?.Name ?? "Chưa xếp sân",
                timeInfo = $"Thứ {x.fs.DayOfWeek} ({x.t?.StartTime:HH\\:mm} - {x.t?.EndTime:HH\\:mm})",
                duration = $"{x.fs.StartDate:dd/MM/yyyy} - {x.fs.EndDate:dd/MM/yyyy}",
                status = x.fs.Status == "cancelled" ? "cancelled" : x.fs.EndDate < today ? "expired" : x.fs.EndDate <= today.AddDays(7) ? "warning" : "active",
                totalPrice = x.fs.TotalPrice
            }).OrderByDescending(x => x.id);

            return Ok(result);
        }

        [HttpPost("fixed-schedules")]
        public async Task<IActionResult> CreateFixedSchedule([FromBody] CreateFixedScheduleDto dto)
        {
            if (!DateOnly.TryParse(dto.StartDate, out DateOnly startDate) || !DateOnly.TryParse(dto.EndDate, out DateOnly endDate))
                return BadRequest("Định dạng ngày không hợp.");
            if (startDate > endDate) return BadRequest("Ngày bắt đầu phải trước ngày kết thúc!");

            var playDates = new List<DateOnly>();
            var tempDate = startDate;
            while (tempDate <= endDate)
            {
                int csharpDow = (int)tempDate.DayOfWeek;
                int vnDow = csharpDow == 0 ? 8 : csharpDow + 1;
                if (vnDow == dto.DayOfWeek) playDates.Add(tempDate);
                tempDate = tempDate.AddDays(1);
            }

            if (!playDates.Any()) return BadRequest("Không có ngày nào phù hợp!");

            var conflictingBookings = await _context.BookingDetails.Include(bd => bd.Booking)
                .Where(bd => bd.CourtId == dto.CourtId && bd.TimeSlotId == dto.TimeSlotId && playDates.Contains(bd.PlayDate) && bd.Booking.Status != "cancelled")
                .ToListAsync();

            if (conflictingBookings.Any())
            {
                var conflictDates = string.Join(", ", conflictingBookings.Select(x => x.PlayDate.ToString("dd/MM/yyyy")));
                return BadRequest($"LỖI TRÙNG LỊCH vào các ngày: {conflictDates}.");
            }

            var fixedSchedule = new FixedSchedule { UserId = dto.UserId, CourtId = dto.CourtId, TimeSlotId = dto.TimeSlotId, DayOfWeek = dto.DayOfWeek, StartDate = startDate, EndDate = endDate, TotalPrice = dto.TotalPrice, Status = "active" };
            _context.FixedSchedules.Add(fixedSchedule);
            await _context.SaveChangesAsync();

            var currentDate = startDate;
            int totalBookingsCreated = 0;
            while (currentDate <= endDate)
            {
                int csharpDow = (int)currentDate.DayOfWeek;
                int vnDow = csharpDow == 0 ? 8 : csharpDow + 1;
                if (vnDow == dto.DayOfWeek)
                {
                    var booking = new Booking { UserId = dto.UserId, TotalPrice = 0, Status = "confirmed", CreatedAt = DateTime.Now };
                    _context.Bookings.Add(booking);
                    await _context.SaveChangesAsync();
                    _context.BookingDetails.Add(new BookingDetail { BookingId = booking.Id, CourtId = dto.CourtId, TimeSlotId = dto.TimeSlotId, PlayDate = currentDate, PriceSnapshot = 0 });
                    totalBookingsCreated++;
                }
                currentDate = currentDate.AddDays(1);
            }
            await _context.SaveChangesAsync();

            try
            {
                var customer = await _context.Users.FindAsync(dto.UserId);
                if (customer != null && !string.IsNullOrEmpty(customer.Email))
                {
                    _ = _emailService.SendEmailAsync(customer.Email, "Xác nhận Hợp đồng Sân Cầu Lông FPT", $"<p>Xin chào {customer.FullName}, hợp đồng bảo lưu sân của bạn đã được xác nhận!</p>");
                }
            }
            catch { }

            return Ok(new { message = "Tạo Hợp đồng thành công!", autoBookings = totalBookingsCreated });
        }

        [HttpPut("fixed-schedules/{id}/cancel")]
        public async Task<IActionResult> CancelFixedSchedule(int id)
        {
            var fs = await _context.FixedSchedules.FindAsync(id);
            if (fs == null) return NotFound("Không tìm thấy hợp đồng");
            if (fs.Status == "cancelled" || fs.Status == "expired") return BadRequest("Hợp đồng đã hủy hoặc hết hạn!");

            fs.Status = "cancelled";
            var today = DateOnly.FromDateTime(DateTime.Now);
            var futureBookings = await _context.BookingDetails.Include(bd => bd.Booking).Where(bd => bd.Booking.UserId == fs.UserId && bd.CourtId == fs.CourtId && bd.TimeSlotId == fs.TimeSlotId && bd.PlayDate >= today && bd.Booking.Status == "confirmed").ToListAsync();

            int freedCount = 0;
            foreach (var detail in futureBookings) { detail.Booking.Status = "cancelled"; freedCount++; }
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã hủy hợp đồng thành công!", freedCourts = freedCount });
        }

        // =======================================================
        // 6. QUẢN LÝ TẤT CẢ BOOKING
        // =======================================================
        [HttpGet("bookings")]
        public async Task<IActionResult> GetAllBookings([FromQuery] string search = "", [FromQuery] string status = "")
        {
            var query = _context.Bookings.Include(b => b.User).Include(b => b.BookingDetails).ThenInclude(bd => bd.Court).Include(b => b.BookingDetails).ThenInclude(bd => bd.TimeSlot).AsQueryable();
            if (!string.IsNullOrEmpty(search)) query = query.Where(b => b.User.FullName.Contains(search) || b.User.Phone.Contains(search));
            if (!string.IsNullOrEmpty(status)) query = query.Where(b => b.Status == status);

            var bookings = await query.OrderByDescending(b => b.CreatedAt).Take(150).ToListAsync();
            var result = bookings.Select(b => new
            {
                id = b.Id,
                customerName = b.User?.FullName ?? "Khách vãng lai",
                phone = b.User?.Phone ?? "",
                totalPrice = b.TotalPrice,
                status = b.Status,
                createdAt = b.CreatedAt,
                courtInfo = b.BookingDetails.Select(bd => new { courtName = bd.Court?.Name, time = bd.TimeSlot != null ? $"{bd.TimeSlot.StartTime:HH\\:mm} - {bd.TimeSlot.EndTime:HH\\:mm}" : "", date = bd.PlayDate }).FirstOrDefault()
            });

            return Ok(result);
        }

        [HttpPut("bookings/{id}/cancel")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null) return NotFound("Không tìm thấy booking");
            if (booking.Status == "completed" || booking.Status == "cancelled") return BadRequest("Không thể hủy đơn này!");

            booking.Status = "cancelled";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã hủy lịch đặt sân thành công!" });
        }

        // =======================================================
        // 7. API TẠO DỮ LIỆU TEST (HỖ TRỢ PASSWORD HASH)
        // =======================================================
        [HttpGet("seed-test-data")]
        public async Task<IActionResult> SeedTestData()
        {
            try
            {
                var hardcodedPassword = _passwordService.HashPassword("123456");

                var staff = await _context.Users.FirstOrDefaultAsync(u => u.Phone == "0988111222");
                if (staff == null) _context.Users.Add(new User { FullName = "Nguyễn Văn Lễ Tân", Phone = "0988111222", Email = "staff_test@fpt.edu.vn", PasswordHash = hardcodedPassword, Role = "Staff", LoyaltyPoints = 0 });
                else staff.PasswordHash = hardcodedPassword;

                var customer = await _context.Users.FirstOrDefaultAsync(u => u.Phone == "0909333444");
                if (customer == null) _context.Users.Add(new User { FullName = "Trần Khách VIP", Phone = "0909333444", Email = "khachvip@gmail.com", PasswordHash = hardcodedPassword, Role = "Customer", LoyaltyPoints = 50 });
                else { customer.PasswordHash = hardcodedPassword; customer.LoyaltyPoints = 50; }

                if (!await _context.Vouchers.AnyAsync(v => v.Code == "FPT50K"))
                    _context.Vouchers.Add(new Voucher { Code = "FPT50K", DiscountAmount = 50000, UsageLimit = 10, ExpiryDate = DateOnly.FromDateTime(DateTime.Now.AddYears(1)) });

                await _context.SaveChangesAsync();

                return Ok(new { message = "Tạo dữ liệu Test thành công!", accounts = new { staff = "0988111222 - Pass: 123456", customer = "0909333444 - Pass: 123456", voucher = "FPT50K" } });
            }
            catch (Exception ex) { return BadRequest("Lỗi: " + ex.Message); }
        }
    }
}