using backend.DTOs.Staff;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

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
        // HÀM BẢO MẬT: TỰ ĐỘNG LẤY CHI NHÁNH CỦA LỄ TÂN TỪ TOKEN
        // =======================================================
        private async Task<int?> GetStaffBranchIdAsync()
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ")) return null;

            var token = authHeader.Substring("Bearer ".Length).Trim();
            try
            {
                var handler = new JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(token);
                // Lấy ID của User từ Token
                var idClaim = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "nameid" || c.Type == "sub");

                if (idClaim != null && int.TryParse(idClaim.Value, out int userId))
                {
                    var user = await _context.Users.FindAsync(userId);
                    return user?.BranchId; // Trả về ID Chi nhánh của nhân viên này
                }
            }
            catch { }
            return null;
        }

        // =======================================================
        // TÍNH TOÁN TRƯỚC SỐ BUỔI VÀ TỔNG TIỀN (PREVIEW)
        // =======================================================
        [HttpGet("preview-fixed-price")]
        public async Task<IActionResult> PreviewFixedPrice([FromQuery] int courtId, [FromQuery] int timeSlotId, [FromQuery] int dayOfWeek, [FromQuery] string startDate, [FromQuery] string endDate)
        {
            if (!DateOnly.TryParse(startDate, out DateOnly start) || !DateOnly.TryParse(endDate, out DateOnly end))
                return BadRequest("Ngày không hợp lệ.");

            if (start > end) return Ok(new { playDays = 0, unitPrice = 0, totalPrice = 0 });

            // 1. Tính số buổi đá hợp lệ
            int playDays = 0;
            var tempDate = start;
            while (tempDate <= end)
            {
                int csharpDow = (int)tempDate.DayOfWeek;
                int vnDow = csharpDow == 0 ? 8 : csharpDow + 1;
                if (vnDow == dayOfWeek) playDays++;
                tempDate = tempDate.AddDays(1);
            }

            if (playDays == 0) return Ok(new { playDays = 0, unitPrice = 0, totalPrice = 0 });

            // 2. Tra cứu giá chuẩn 1 ca
            var court = await _context.Courts.FindAsync(courtId);
            if (court == null) return NotFound("Không tìm thấy sân");

            var priceConfig = await _context.PriceConfigs.FirstOrDefaultAsync(p => p.CourtTypeId == court.CourtTypeId && p.TimeSlotId == timeSlotId && p.DayOfWeek == dayOfWeek);
            decimal unitPrice = priceConfig != null ? priceConfig.Price : 50000; // Giá mặc định 50k nếu Admin chưa setup

            // 3. Trả kết quả về cho React
            return Ok(new { playDays = playDays, unitPrice = unitPrice, totalPrice = playDays * unitPrice });
        }

        // =======================================================
        // 1. LẤY CHI TIẾT HÓA ĐƠN TRƯỚC KHI TẤT TOÁN 
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

            decimal remainingAmount = 0;
            if (booking.Status != "completed")
            {
                remainingAmount = (courtTotal + posTotal) - alreadyPaid;
                if (remainingAmount < 0) remainingAmount = 0;
            }

            // 1. Lấy tất cả voucher đang còn hiệu lực
            var allActiveVouchers = await _context.Vouchers
                .Where(v => v.UsageLimit > 0 && v.ExpiryDate >= DateOnly.FromDateTime(DateTime.Now))
                .ToListAsync();

            // 2. LỌC THÔNG MINH: Lấy mã chung (không có -U) HOẶC mã riêng của đúng khách
            var availableVouchers = allActiveVouchers
    .Where(v => v.Code.Contains($"-U{booking.UserId}-")) // Chỉ giữ lại đúng điều kiện này
    .Select(v => new
    {
        code = v.Code,
        discountAmount = v.DiscountAmount,
        label = $"🎁 Quà của khách ({v.Code}) - Giảm {v.DiscountAmount:N0}đ"
    })
    .ToList();
            // Tính nháp số điểm khách chuẩn bị được cộng từ hóa đơn này
            int estimatedPoints = (int)(remainingAmount / 10000);

            return Ok(new
            {
                bookingId = booking.Id,
                customerName = booking.User?.FullName ?? "Khách vãng lai",
                loyaltyPoints = booking.User?.LoyaltyPoints ?? 0,
                estimatedPoints = estimatedPoints, // Trả thêm điểm dự kiến cộng thêm
                courtTotal,
                posTotal,
                alreadyPaid,
                remainingAmount,
                availableVouchers // Trả về danh sách voucher đã được lọc sạch sẽ
            });
        }

        // =======================================================
        // 2. THANH TOÁN (CHECKOUT) & TRỪ VOUCHER
        // =======================================================
        [HttpPost("checkout/{bookingId}")]
        public async Task<IActionResult> CheckoutBooking(int bookingId, [FromBody] CheckoutDto dto)
        {
            var booking = await _context.Bookings
                .Include(b => b.User).Include(b => b.Orders).Include(b => b.Payments)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return NotFound("Không tìm thấy Booking");
            if (booking.Status == "completed") return BadRequest("Đơn này đã được thanh toán rồi!");

            decimal courtTotal = booking.TotalPrice ?? 0;
            decimal posTotal = booking.Orders.Sum(o => o.TotalAmount);
            decimal alreadyPaid = booking.Payments.Where(p => p.Status == "success").Sum(p => p.Amount);

            decimal discountAmount = 0;

            if (!string.IsNullOrEmpty(dto.VoucherCode))
            {
                var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == dto.VoucherCode);

                if (voucher == null) return BadRequest("Mã Voucher không tồn tại!");
                if (voucher.ExpiryDate < DateOnly.FromDateTime(DateTime.Now)) return BadRequest("Mã Voucher đã hết hạn!");
                if (voucher.UsageLimit <= 0) return BadRequest("Mã Voucher đã hết lượt sử dụng!");

                discountAmount = voucher.DiscountAmount;
                voucher.UsageLimit -= 1;
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
            return Ok(new { message = $"Thanh toán thành công! Khách được cộng {pointsEarned} điểm.", pointsAdded = pointsEarned });
        }

        // =======================================================
        // 3. GIA HẠN CA SAU (ĐÃ FIX LỖI NHẢY CÓC TỪ BACKEND)
        // =======================================================
        [HttpPost("extend-booking/{bookingId}")]
        public async Task<IActionResult> ExtendBooking(int bookingId, [FromQuery] int courtId, [FromQuery] int nextSlotId)
        {
            // BỔ SUNG: Bắt buộc Include BookingDetails và TimeSlot để check giờ
            var booking = await _context.Bookings
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return NotFound(new { message = "Không tìm thấy đơn đặt sân." });
            if (booking.Status == "completed") return BadRequest(new { message = "Đơn đã thanh toán, không thể gia hạn." });

            var today = DateOnly.FromDateTime(DateTime.Now);

            // 🛑 CHỐT CHẶN 1: Ca muốn gia hạn đã có người khác đặt chưa?
            var isBooked = await _context.BookingDetails.AnyAsync(bd => bd.CourtId == courtId && bd.TimeSlotId == nextSlotId && bd.PlayDate == today && bd.Booking.Status != "cancelled");
            if (isBooked) return BadRequest(new { message = "Ca tiếp theo đã có người khác đặt mất rồi!" });

            // 🛑 CHỐT CHẶN 2 (QUAN TRỌNG): CẤM NHẢY CÓC!
            // Lấy ca cuối cùng mà khách đang đánh trên sân này
            var currentLastDetail = booking.BookingDetails
                .Where(bd => bd.CourtId == courtId && bd.PlayDate == today)
                .OrderByDescending(bd => bd.TimeSlot.EndTime)
                .FirstOrDefault();

            if (currentLastDetail != null)
            {
                var nextSlotObj = await _context.TimeSlots.FindAsync(nextSlotId);
                if (nextSlotObj == null) return NotFound(new { message = "Ca gia hạn không tồn tại." });

                // So sánh: Giờ bắt đầu của ca mới PHẢI BẰNG giờ kết thúc của ca cũ
                if (nextSlotObj.StartTime != currentLastDetail.TimeSlot.EndTime)
                {
                    return BadRequest(new { message = "Lỗi: Ca gia hạn bắt buộc phải nối tiếp liền kề với ca hiện tại! Không được nhảy cóc." });
                }
            }

            // 3. Hợp lệ -> Tiến hành tính tiền và lưu
            var court = await _context.Courts.FindAsync(courtId);
            int csharpDow = (int)today.DayOfWeek;
            int vnDow = csharpDow == 0 ? 8 : csharpDow + 1;

            var priceConfig = await _context.PriceConfigs.FirstOrDefaultAsync(p => p.CourtTypeId == court.CourtTypeId && p.TimeSlotId == nextSlotId && p.DayOfWeek == vnDow);
            decimal actualPrice = priceConfig != null ? priceConfig.Price : 50000;

            var newDetail = new BookingDetail { BookingId = bookingId, CourtId = courtId, TimeSlotId = nextSlotId, PlayDate = today, PriceSnapshot = actualPrice };
            _context.BookingDetails.Add(newDetail);

            booking.TotalPrice = (booking.TotalPrice ?? 0) + actualPrice;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Gia hạn thành công! Phí ca mới là {actualPrice:N0}đ" });
        }

        // =======================================================
        // 4. QUẢN LÝ LỊCH SÂN THEO NGÀY (LỌC THEO CHI NHÁNH TỪ TOKEN)
        // =======================================================
        [HttpGet("active-bookings")]
        public async Task<IActionResult> GetActiveBookings()
        {
            var branchId = await GetStaffBranchIdAsync();
            var today = DateOnly.FromDateTime(DateTime.Now);

            var bookings = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Court)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TimeSlot)
                .Where(b => b.Status == "confirmed" || b.Status == "pending")
                .Where(b => b.BookingDetails.Any(bd => bd.PlayDate == today))
                // BẢO MẬT: Chỉ lấy khách đang đá ở chi nhánh của Lễ tân này
                .Where(b => branchId == null || b.BookingDetails.Any(bd => bd.Court.BranchId == branchId))
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

        [HttpGet("daily-schedule")]
        public async Task<IActionResult> GetDailySchedule([FromQuery] string date)
        {
            if (!DateOnly.TryParse(date, out DateOnly targetDate))
                return BadRequest("Định dạng ngày không hợp lệ.");

            var branchId = await GetStaffBranchIdAsync();

            // CHỈ TRẢ VỀ CÁC SÂN CỦA CHI NHÁNH ĐÓ
            var courtQuery = _context.Courts.AsQueryable();
            if (branchId.HasValue)
            {
                courtQuery = courtQuery.Where(c => c.BranchId == branchId.Value);
            }
            var courts = await courtQuery.OrderBy(c => c.Name).ToListAsync();

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
        // 5. QUẢN LÝ HỢP ĐỒNG CỐ ĐỊNH (LỌC THEO CHI NHÁNH TỪ TOKEN)
        // =======================================================
        // Bổ sung thêm tham số [FromQuery] string? searchName
        [HttpGet("fixed-schedules")]
        // Thêm tham số page và pageSize
        public async Task<IActionResult> GetFixedSchedules(
      [FromQuery] string? searchName,
      [FromQuery] int page = 1,
      [FromQuery] int pageSize = 6) // Mặc định lấy 6 item/trang
        {
            var branchId = await GetStaffBranchIdAsync();

            var query = from fs in _context.FixedSchedules
                        join u in _context.Users on fs.UserId equals u.Id into userGroup
                        from u in userGroup.DefaultIfEmpty()
                        join c in _context.Courts on fs.CourtId equals c.Id into courtGroup
                        from c in courtGroup.DefaultIfEmpty()
                        join t in _context.TimeSlots on fs.TimeSlotId equals t.Id into timeGroup
                        from t in timeGroup.DefaultIfEmpty()
                        where branchId == null || c.BranchId == branchId
                        select new { fs, u, c, t };

            if (!string.IsNullOrWhiteSpace(searchName))
            {
                var lowerSearch = searchName.ToLower();
                query = query.Where(x => x.u != null && x.u.FullName.ToLower().Contains(lowerSearch));
            }

            // === LOGIC PHÂN TRANG (PAGINATION) ===
            int totalItems = await query.CountAsync(); // Đếm tổng số dòng
            int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize); // Tính tổng số trang

            // Cắt dữ liệu theo trang hiện tại
            var schedules = await query
                .OrderByDescending(x => x.fs.Id) // Nhớ phải OrderBy trước khi Skip/Take
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            // =====================================

            var today = DateOnly.FromDateTime(DateTime.Now);
            var itemsResult = schedules.Select(x => new
            {
                id = x.fs.Id,
                teamName = x.u?.FullName ?? "Khách hàng",
                phone = x.u?.Phone ?? "N/A",
                courtName = x.c?.Name ?? "Chưa xếp sân",
                timeInfo = $"Thứ {x.fs.DayOfWeek} ({x.t?.StartTime:HH\\:mm} - {x.t?.EndTime:HH\\:mm})",
                duration = $"{x.fs.StartDate:dd/MM/yyyy} - {x.fs.EndDate:dd/MM/yyyy}",
                status = x.fs.Status == "cancelled" ? "cancelled" : x.fs.EndDate < today ? "expired" : x.fs.EndDate <= today.AddDays(7) ? "warning" : "active",
                totalPrice = x.fs.TotalPrice
            });

            // Quan trọng: Trả về 1 cục JSON bọc lại, chứa cả data lẫn thông tin phân trang
            return Ok(new
            {
                data = itemsResult,
                currentPage = page,
                totalPages = totalPages,
                totalItems = totalItems
            });
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

            // MỚI: Bắt buộc lấy giá chuẩn từ Backend, không tin tưởng TotalPrice do Frontend gửi lên
            var court = await _context.Courts.FindAsync(dto.CourtId);
            var priceConfig = await _context.PriceConfigs.FirstOrDefaultAsync(p => p.CourtTypeId == court.CourtTypeId && p.TimeSlotId == dto.TimeSlotId && p.DayOfWeek == dto.DayOfWeek);
            decimal unitPrice = priceConfig != null ? priceConfig.Price : 50000;
            decimal calculatedTotalPrice = playDates.Count * unitPrice;

            var fixedSchedule = new FixedSchedule { UserId = dto.UserId, CourtId = dto.CourtId, TimeSlotId = dto.TimeSlotId, DayOfWeek = dto.DayOfWeek, StartDate = startDate, EndDate = endDate, TotalPrice = calculatedTotalPrice, Status = "active" };
            _context.FixedSchedules.Add(fixedSchedule);
            await _context.SaveChangesAsync();

            // MỚI: Duyệt qua danh sách playDates và lưu kèm Đơn Giá (unitPrice)
            foreach (var date in playDates)
            {
                var booking = new Booking { UserId = dto.UserId, TotalPrice = unitPrice, Status = "confirmed", CreatedAt = DateTime.Now };
                _context.Bookings.Add(booking);
                await _context.SaveChangesAsync();

                // Đã fix lỗi PriceSnapshot = 0
                _context.BookingDetails.Add(new BookingDetail { BookingId = booking.Id, CourtId = dto.CourtId, TimeSlotId = dto.TimeSlotId, PlayDate = date, PriceSnapshot = unitPrice });
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

            return Ok(new { message = "Tạo Hợp đồng thành công!", autoBookings = playDates.Count });
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
            var branchId = await GetStaffBranchIdAsync();

            var query = _context.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Court)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TimeSlot)
                .AsQueryable();

            // CHỈ XEM BOOKING CỦA CHI NHÁNH MÌNH QUẢN LÝ
            if (branchId.HasValue)
            {
                query = query.Where(b => b.BookingDetails.Any(bd => bd.Court.BranchId == branchId.Value));
            }

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

        [HttpGet("setup-data")]
        public async Task<IActionResult> GetSetupData()
        {
            var branchId = await GetStaffBranchIdAsync();

            var customers = await _context.Users
                .Where(u => u.Role == "Customer" && u.Status == "active")
                .Select(u => new
                {
                    id = u.Id,
                    fullName = u.FullName,
                    phone = u.Phone
                })
                .ToListAsync();

            return Ok(new
            {
                customers = customers
            });
        }
        // =======================================================
        // 8. ĐẶT SÂN TẠI CHỖ (DROPDOWN KHÁCH HÀNG)
        // =======================================================
        [HttpPost("walk-in")]
        public async Task<IActionResult> CreateWalkInBooking([FromBody] WalkInBookingDto dto)
        {
            if (!DateOnly.TryParse(dto.PlayDate, out DateOnly playDate))
                return BadRequest("Ngày không hợp lệ.");

            // 1. Kiểm tra xem ca này đã có ai đặt chưa
            var isBooked = await _context.BookingDetails.Include(bd => bd.Booking)
                .AnyAsync(bd => bd.CourtId == dto.CourtId && bd.TimeSlotId == dto.TimeSlotId
                             && bd.PlayDate == playDate && bd.Booking.Status != "cancelled");

            if (isBooked) return BadRequest("Lỗi: Ca này đang có người chơi hoặc đã được đặt trước!");

            // 2. Lấy giá tiền
            var court = await _context.Courts.FindAsync(dto.CourtId);
            if (court == null) return NotFound("Không tìm thấy sân.");
            int vnDow = (int)playDate.DayOfWeek == 0 ? 8 : (int)playDate.DayOfWeek + 1;
            var priceConfig = await _context.PriceConfigs.FirstOrDefaultAsync(p => p.CourtTypeId == court.CourtTypeId && p.TimeSlotId == dto.TimeSlotId && p.DayOfWeek == vnDow);
            decimal price = priceConfig != null ? priceConfig.Price : 50000;

            // 3. Xử lý User (Chủ yếu lấy từ Dropdown Frontend gửi lên)
            User user = null;
            if (dto.UserId.HasValue && dto.UserId > 0)
            {
                // Nếu lễ tân chọn một khách hàng có sẵn trong Dropdown
                user = await _context.Users.FindAsync(dto.UserId.Value);
            }

            if (user == null)
            {
                // Nếu lễ tân chọn "Khách Vãng Lai" (UserId = null)
                user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == "0000000000");
                if (user == null)
                {
                    // Tạo 1 tài khoản mặc định duy nhất cho tất cả Khách Vãng Lai (chỉ tạo 1 lần)
                    user = new User { FullName = "Khách Vãng Lai", Phone = "0000000000", Role = "Customer", Status = "active", LoyaltyPoints = 0 };
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }
            }

            // 4. Tạo Booking & Details
            var booking = new Booking { UserId = user.Id, TotalPrice = price, Status = "confirmed", CreatedAt = DateTime.Now };
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            _context.BookingDetails.Add(new BookingDetail { BookingId = booking.Id, CourtId = dto.CourtId, TimeSlotId = dto.TimeSlotId, PlayDate = playDate, PriceSnapshot = price });
            await _context.SaveChangesAsync();

            return Ok(new { message = "Tạo lịch chơi thành công!" });
        }
    }

    // DTO đã được thay đổi: Dùng UserId thay vì Name/Phone
    public class WalkInBookingDto
    {
        public int CourtId { get; set; }
        public int TimeSlotId { get; set; }
        public string PlayDate { get; set; }
        public int? UserId { get; set; } // Nhận ID từ Dropdown, nếu null là Khách vãng lai
    }


}

