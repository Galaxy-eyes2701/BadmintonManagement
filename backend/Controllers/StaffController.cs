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

        public StaffController(BadmintonManagementContext context, EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // =======================================================
        // PHẦN 1: QUẢN LÝ LỊCH SÂN THEO NGÀY & ĐÓNG/MỞ SÂN
        // =======================================================

        [HttpGet("daily-schedule")]
        public async Task<IActionResult> GetDailySchedule([FromQuery] string date)
        {
            if (!DateOnly.TryParse(date, out DateOnly targetDate))
            {
                return BadRequest("Định dạng ngày không hợp lệ. Vui lòng dùng YYYY-MM-DD");
            }

            var courts = await _context.Courts.OrderBy(c => c.Name).ToListAsync();
            var timeSlots = await _context.TimeSlots.OrderBy(t => t.StartTime).ToListAsync();

            var bookingsForDay = await _context.BookingDetails
                .Include(bd => bd.Booking)
                .ThenInclude(b => b.User)
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
                        time = $"{slot.StartTime:hh\\:mm} - {slot.EndTime:hh\\:mm}",
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

            return Ok(new { message = $"Đã cập nhật trạng thái sân thành {status}" });
        }

        // =======================================================
        // PHẦN 2: QUẢN LÝ BOOKING CHUNG & THANH TOÁN
        // =======================================================

        [HttpGet("bookings")]
        public async Task<IActionResult> GetAllBookings([FromQuery] string search = "", [FromQuery] string status = "")
        {
            var query = _context.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Court)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TimeSlot)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(b => b.User.FullName.Contains(search) || b.User.Phone.Contains(search));
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(b => b.Status == status);
            }

            var bookings = await query
                .OrderByDescending(b => b.CreatedAt)
                .Take(150)
                .ToListAsync();

            var result = bookings.Select(b => new
            {
                id = b.Id,
                customerName = b.User?.FullName ?? "Khách vãng lai",
                phone = b.User?.Phone ?? "",
                totalPrice = b.TotalPrice,
                status = b.Status,
                createdAt = b.CreatedAt,
                courtInfo = b.BookingDetails.Select(bd => new
                {
                    courtName = bd.Court?.Name,
                    time = bd.TimeSlot != null ? $"{bd.TimeSlot.StartTime:hh\\:mm} - {bd.TimeSlot.EndTime:hh\\:mm}" : "",
                    date = bd.PlayDate
                }).FirstOrDefault()
            });

            return Ok(result);
        }

        [HttpPut("bookings/{id}/cancel")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null) return NotFound("Không tìm thấy booking");
            if (booking.Status == "completed") return BadRequest("Không thể hủy đơn đã hoàn thành!");
            if (booking.Status == "cancelled") return BadRequest("Đơn này đã bị hủy từ trước!");

            booking.Status = "cancelled";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã hủy lịch đặt sân thành công. Sân đã được giải phóng!" });
        }

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
            decimal remainingAmount = (courtTotal + posTotal) - alreadyPaid;

            if (remainingAmount > 0)
            {
                var newPayment = new Payment
                {
                    BookingId = booking.Id,
                    Amount = remainingAmount,
                    PaymentMethod = dto.PaymentMethod,
                    Status = "success",
                    CreatedAt = DateTime.Now
                };
                _context.Payments.Add(newPayment);
            }

            booking.Status = "completed";

            int pointsEarned = 0;
            if (booking.User != null && booking.User.Role == "Customer")
            {
                pointsEarned = (int)((courtTotal + posTotal) / 100000);
                booking.User.LoyaltyPoints = (booking.User.LoyaltyPoints ?? 0) + pointsEarned;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Thanh toán và trả sân thành công!",
                pointsAdded = pointsEarned
            });
        }

        // =======================================================
        // PHẦN 3: LỊCH CỐ ĐỊNH (KHÁCH RUỘT)
        // =======================================================

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
                timeInfo = $"Thứ {x.fs.DayOfWeek} ({x.t?.StartTime:hh\\:mm} - {x.t?.EndTime:hh\\:mm})",
                duration = $"{x.fs.StartDate:dd/MM/yyyy} - {x.fs.EndDate:dd/MM/yyyy}",

                status = x.fs.Status == "cancelled" ? "cancelled"
                       : x.fs.EndDate < today ? "expired"
                       : x.fs.EndDate <= today.AddDays(7) ? "warning"
                       : "active",

                totalPrice = x.fs.TotalPrice
            }).OrderByDescending(x => x.id);

            return Ok(result);
        }

        [HttpPut("fixed-schedules/{id}/cancel")]
        public async Task<IActionResult> CancelFixedSchedule(int id)
        {
            var fs = await _context.FixedSchedules.FindAsync(id);
            if (fs == null) return NotFound("Không tìm thấy hợp đồng");
            if (fs.Status == "cancelled") return BadRequest("Hợp đồng này đã bị hủy từ trước!");
            if (fs.Status == "expired") return BadRequest("Hợp đồng đã hết hạn, không thể hủy!");

            fs.Status = "cancelled";

            var today = DateOnly.FromDateTime(DateTime.Now);

            var futureBookings = await _context.BookingDetails
                .Include(bd => bd.Booking)
                .Where(bd => bd.Booking.UserId == fs.UserId
                          && bd.CourtId == fs.CourtId
                          && bd.TimeSlotId == fs.TimeSlotId
                          && bd.PlayDate >= today
                          && bd.Booking.Status == "confirmed")
                .ToListAsync();

            int freedCount = 0;
            foreach (var detail in futureBookings)
            {
                detail.Booking.Status = "cancelled";
                freedCount++;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Đã hủy hợp đồng thành công!",
                freedCourts = freedCount
            });
        }

        [HttpPost("fixed-schedules")]
        public async Task<IActionResult> CreateFixedSchedule([FromBody] CreateFixedScheduleDto dto)
        {
            if (!DateOnly.TryParse(dto.StartDate, out DateOnly startDate) ||
                !DateOnly.TryParse(dto.EndDate, out DateOnly endDate))
            {
                return BadRequest("Định dạng ngày không hợp lệ.");
            }

            if (startDate > endDate) return BadRequest("Ngày bắt đầu phải trước ngày kết thúc!");

            // 1. CHỐNG TRÙNG LỊCH
            var playDates = new List<DateOnly>();
            var tempDate = startDate;
            while (tempDate <= endDate)
            {
                int csharpDow = (int)tempDate.DayOfWeek;
                int vnDow = csharpDow == 0 ? 8 : csharpDow + 1;
                if (vnDow == dto.DayOfWeek) playDates.Add(tempDate);
                tempDate = tempDate.AddDays(1);
            }

            if (!playDates.Any()) return BadRequest("Không có ngày nào phù hợp trong khoảng thời gian này!");

            var conflictingBookings = await _context.BookingDetails
                .Include(bd => bd.Booking)
                .Where(bd => bd.CourtId == dto.CourtId
                          && bd.TimeSlotId == dto.TimeSlotId
                          && playDates.Contains(bd.PlayDate)
                          && bd.Booking.Status != "cancelled")
                .ToListAsync();

            if (conflictingBookings.Any())
            {
                var conflictDates = string.Join(", ", conflictingBookings.Select(x => x.PlayDate.ToString("dd/MM/yyyy")));
                return BadRequest($"LỖI TRÙNG LỊCH: Sân và Ca này đã có khách đặt vào các ngày ({conflictDates}). Vui lòng chọn sân hoặc ca khác!");
            }

            // 2. LƯU HỢP ĐỒNG
            var fixedSchedule = new FixedSchedule
            {
                UserId = dto.UserId,
                CourtId = dto.CourtId,
                TimeSlotId = dto.TimeSlotId,
                DayOfWeek = dto.DayOfWeek,
                StartDate = startDate,
                EndDate = endDate,
                TotalPrice = dto.TotalPrice,
                Status = "active"
            };

            _context.FixedSchedules.Add(fixedSchedule);
            await _context.SaveChangesAsync();

            // 3. TỰ ĐỘNG SINH LỊCH (BOOKINGS)
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

                    var detail = new BookingDetail { BookingId = booking.Id, CourtId = dto.CourtId, TimeSlotId = dto.TimeSlotId, PlayDate = currentDate, PriceSnapshot = 0 };
                    _context.BookingDetails.Add(detail);
                    totalBookingsCreated++;
                }
                currentDate = currentDate.AddDays(1);
            }
            await _context.SaveChangesAsync();

            // 4. GỬI EMAIL THÔNG BÁO CHO KHÁCH HÀNG
            try
            {
                var customer = await _context.Users.FindAsync(dto.UserId);
                var court = await _context.Courts.FindAsync(dto.CourtId);
                var timeSlot = await _context.TimeSlots.FindAsync(dto.TimeSlotId);

                if (customer != null && !string.IsNullOrEmpty(customer.Email))
                {
                    string subject = "Xác nhận Đăng ký Hợp đồng Sân Cầu Lông FPT";
                    string body = $@"
                        <div style='font-family: Arial; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;'>
                            <h2 style='color: #0d7ff2;'>SÂN CẦU LÔNG FPT</h2>
                            <h3>Xin chào {customer.FullName},</h3>
                            <p>Chúng tôi xin xác nhận bạn đã đăng ký thành công Hợp đồng khách ruột với thông tin sau:</p>
                            <ul>
                                <li><b>Sân thi đấu:</b> {court?.Name}</li>
                                <li><b>Thời gian:</b> Thứ {dto.DayOfWeek} hàng tuần ({timeSlot?.StartTime:hh\:mm} - {timeSlot?.EndTime:hh\:mm})</li>
                                <li><b>Thời hạn:</b> Từ {startDate:dd/MM/yyyy} đến {endDate:dd/MM/yyyy}</li>
                                <li><b>Tổng tiền thanh toán:</b> <span style='color: #16a34a; font-weight: bold;'>{dto.TotalPrice:N0} VNĐ</span></li>
                            </ul>
                            <p>Hệ thống đã tự động khóa sân bảo lưu cho bạn trong suốt thời gian trên.</p>
                            <p>Cảm ơn bạn đã tin tưởng. Chúc team có những trận cầu nảy lửa!</p>
                            <br/>
                            <p><i>Ban quản lý Sân Cầu Lông FPT</i></p>
                        </div>";

                    _ = _emailService.SendEmailAsync(customer.Email, subject, body);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Lỗi gửi email: " + ex.Message);
            }

            return Ok(new { message = "Tạo Hợp đồng thành công!", autoBookings = totalBookingsCreated });
        }

        // =======================================================
        // PHẦN 4: API HỖ TRỢ ĐỔ DỮ LIỆU RA DROPDOWN (FORM TẠO HỢP ĐỒNG)
        // =======================================================
        [HttpGet("setup-data")]
        public async Task<IActionResult> GetSetupData()
        {
            var customers = await _context.Users
                .Where(u => u.Role == "Customer")
                .Select(u => new { u.Id, u.FullName, u.Phone })
                .ToListAsync();

            var courts = await _context.Courts
                .Select(c => new { c.Id, c.Name })
                .ToListAsync();

            var timeSlots = await _context.TimeSlots
                .Select(t => new
                {
                    t.Id,
                    time = $"{t.StartTime:hh\\:mm} - {t.EndTime:hh\\:mm}"
                })
                .ToListAsync();

            return Ok(new { customers, courts, timeSlots });
        }
    }
}