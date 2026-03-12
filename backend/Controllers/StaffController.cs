using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StaffController : ControllerBase
    {
        private readonly BadmintonManagementContext _context;

        public StaffController(BadmintonManagementContext context)
        {
            _context = context;
        }

        // 1. API LẤY LỊCH SÂN THEO NGÀY
        [HttpGet("daily-schedule")]
        public async Task<IActionResult> GetDailySchedule([FromQuery] string date)
        {
            if (!DateOnly.TryParse(date, out DateOnly targetDate))
            {
                return BadRequest("Định dạng ngày không hợp lệ. Vui lòng dùng YYYY-MM-DD");
            }

            var courts = await _context.Courts
                .OrderBy(c => c.Name)
                .ToListAsync();

            var timeSlots = await _context.TimeSlots
                .OrderBy(t => t.StartTime)
                .ToListAsync();

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

        // 2. API ĐÓNG/MỞ SÂN (BẢO TRÌ)
        [HttpPut("toggle-court-status/{courtId}")]
        public async Task<IActionResult> ToggleCourtStatus(int courtId, [FromBody] string status)
        {
            var court = await _context.Courts.FindAsync(courtId);
            if (court == null) return NotFound("Không tìm thấy sân");

            court.Status = status;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã cập nhật trạng thái sân thành {status}" });
        }

        // --- CLAS DTO ĐỂ NHẬN DỮ LIỆU THANH TOÁN ---
        public class CheckoutDto
        {
            public string PaymentMethod { get; set; } = "CASH";
        }
        // 4. LẤY DANH SÁCH TẤT CẢ BOOKING (CÓ TÌM KIẾM & LỌC STATUS)
        [HttpGet("bookings")]
        public async Task<IActionResult> GetAllBookings([FromQuery] string search = "", [FromQuery] string status = "")
        {
            var query = _context.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Court)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TimeSlot)
                .AsQueryable();

            // Lọc theo tên khách hoặc SĐT
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(b => b.User.FullName.Contains(search) || b.User.Phone.Contains(search));
            }

            // LỌC THEO TRẠNG THÁI (MỚI THÊM)
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(b => b.Status == status);
            }

            var bookings = await query.OrderByDescending(b => b.CreatedAt).ToListAsync();

            var result = bookings.Select(b => new
            {
                id = b.Id,
                customerName = b.User?.FullName ?? "Khách vãng lai",
                phone = b.User?.Phone ?? "",
                totalPrice = b.TotalPrice,
                status = b.Status, // 'confirmed', 'completed', 'cancelled'
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

        // 5. LỄ TÂN HỦY BOOKING (NẾU KHÁCH BÙNG KÈO)
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

        // 3. API TẤT TOÁN VÀ TÍCH ĐIỂM
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

            // Tính toán tiền nong
            decimal courtTotal = booking.TotalPrice ?? 0;
            decimal posTotal = booking.Orders.Sum(o => o.TotalAmount);
            decimal alreadyPaid = booking.Payments.Where(p => p.Status == "success").Sum(p => p.Amount);
            decimal remainingAmount = (courtTotal + posTotal) - alreadyPaid;

            // Nếu còn nợ thì tạo giao dịch trả nốt
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

            // Đổi trạng thái Sân thành Hoàn tất
            booking.Status = "completed";

            // Tích điểm cho khách (100k = 1 điểm)
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
    }
}