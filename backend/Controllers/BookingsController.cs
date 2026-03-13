using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using backend.Services;
using backend.DTOs;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _bookingService;

        public BookingsController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        // ── GET /api/bookings/available-courts ──────────────────────────────
        /// <summary>Xem sân trống theo ngày</summary>
        [HttpGet("available-courts")]
        public async Task<IActionResult> GetAvailableCourts(
            [FromQuery] DateTime date,
            [FromQuery] int? branchId = null,
            [FromQuery] int? courtTypeId = null)
        {
            if (date == default)
                return BadRequest(new { message = "Vui lòng cung cấp ngày hợp lệ (date=YYYY-MM-DD)" });

            if (date.Date < DateTime.Today)
                return BadRequest(new { message = "Không thể xem lịch sân trong quá khứ" });

            var result = await _bookingService.GetAvailableCourtsAsync(date, branchId, courtTypeId);
            return Ok(new { success = true, date = date.ToString("dd/MM/yyyy"), data = result });
        }

        // ── POST /api/bookings ───────────────────────────────────────────────
        /// Đặt sân
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            if (dto.Slots == null || dto.Slots.Count == 0)
                return BadRequest(new { message = "Vui lòng chọn ít nhất 1 slot" });

            // Validate ngày không trong quá khứ
            foreach (var slot in dto.Slots)
            {
                if (slot.PlayDate.Date < DateTime.Today)
                    return BadRequest(new { message = "Không thể đặt sân ngày trong quá khứ" });
            }

            try
            {
                var result = await _bookingService.CreateBookingAsync(userId.Value, dto);
                return Ok(new { success = true, message = "Đặt sân thành công!", data = result });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── DELETE /api/bookings/{id} ────────────────────────────────────────
        /// Hủy booking
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _bookingService.CancelBookingAsync(id, userId.Value);

            if (!result)
                return BadRequest(new
                {
                    success = false,
                    message = "Không thể hủy booking. Booking không tồn tại, đã thanh toán, hoặc đã bị hủy trước đó."
                });

            return Ok(new { success = true, message = "Hủy booking thành công" });
        }

        // ── GET /api/bookings/my ─────────────────────────────────────────────
        /// <summary>Lịch sử booking của user hiện tại</summary>
        [HttpGet("my")]
        [Authorize]
        public async Task<IActionResult> GetMyBookings()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _bookingService.GetUserBookingsAsync(userId.Value);
            return Ok(new { success = true, total = result.Count, data = result });
        }

        // ── GET /api/bookings/{id} ───────────────────────────────────────────
        /// <summary>Chi tiết booking</summary>
        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetBookingById(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _bookingService.GetBookingByIdAsync(id, userId.Value);
            if (result == null)
                return NotFound(new { success = false, message = "Không tìm thấy booking" });

            return Ok(new { success = true, data = result });
        }

        // ── GET /api/bookings/my/profile ─────────────────────────────────────
        /// <summary>Hồ sơ + điểm tích lũy</summary>
        [HttpGet("my/profile")]
        [Authorize]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            try
            {
                var result = await _bookingService.GetUserProfileAsync(userId.Value);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
        }

        // ── GET /api/bookings/my/orders ──────────────────────────────────────
        /// <summary>Hóa đơn mua hàng của user</summary>
        [HttpGet("my/orders")]
        [Authorize]
        public async Task<IActionResult> GetMyOrders()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _bookingService.GetUserOrdersAsync(userId.Value);
            return Ok(new { success = true, total = result.Count, data = result });
        }

        // ── POST /api/bookings/validate-voucher ──────────────────────────────
        /// Kiểm tra voucher
        [HttpPost("validate-voucher")]
        [Authorize]
        public async Task<IActionResult> ValidateVoucher([FromBody] ValidateVoucherRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Code))
                return BadRequest(new { message = "Vui lòng nhập mã voucher" });

            var result = await _bookingService.ValidateVoucherAsync(req.Code, req.TotalAmount);
            return Ok(new { success = result.IsValid, data = result });
        }

        // ── Helpers ──────────────────────────────────────────────────────────
        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)
                     ?? User.FindFirst("sub")
                     ?? User.FindFirst("userId");
            return claim != null && int.TryParse(claim.Value, out int id) ? id : null;
        }
    }

    public class ValidateVoucherRequest
    {
        public string Code { get; set; } = "";
        public decimal TotalAmount { get; set; }
    }
}