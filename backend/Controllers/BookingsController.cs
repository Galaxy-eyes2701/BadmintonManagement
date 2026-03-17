using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using backend.Services;
using backend.DTOs;
using backend.Interface.Service;

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

        // Lấy userId từ token thủ công — không dùng [Authorize]
        private int? GetUserIdFromToken()
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return null;

            var token = authHeader.Substring("Bearer ".Length).Trim();
            try
            {
                var handler = new JwtSecurityTokenHandler();
                var jwt = handler.ReadJwtToken(token);

                var idClaim = jwt.Claims.FirstOrDefault(c =>
                    c.Type == ClaimTypes.NameIdentifier ||
                    c.Type == "nameid" ||
                    c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" ||
                    c.Type == "sub");

                if (idClaim != null && int.TryParse(idClaim.Value, out int userId))
                    return userId;
            }
            catch { }
            return null;
        }

        // GET /api/bookings/available-courts
        [HttpGet("available-courts")]
        public async Task<IActionResult> GetAvailableCourts(
            [FromQuery] string date,
            [FromQuery] int? branchId = null,
            [FromQuery] int? courtTypeId = null)
        {
            if (!DateTime.TryParse(date, out var parsedDate))
                return BadRequest(new { message = "Vui lòng cung cấp ngày hợp lệ (định dạng YYYY-MM-DD)" });
            
            if (parsedDate.Date < DateTime.Today)
                return BadRequest(new { message = "Không thể xem lịch sân trong quá khứ" });

            var result = await _bookingService.GetAvailableCourtsAsync(parsedDate, branchId, courtTypeId);
            return Ok(new { success = true, date = parsedDate.ToString("dd/MM/yyyy"), data = result });
        }

        // POST /api/bookings
        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto dto)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập" });

            if (dto.Slots == null || dto.Slots.Count == 0)
                return BadRequest(new { message = "Vui lòng chọn ít nhất 1 slot" });

            foreach (var slot in dto.Slots)
                if (slot.PlayDate.Date < DateTime.Today)
                    return BadRequest(new { message = "Không thể đặt sân ngày trong quá khứ" });

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

        // DELETE /api/bookings/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập" });

            var result = await _bookingService.CancelBookingAsync(id, userId.Value);
            if (!result)
                return BadRequest(new { success = false, message = "Không thể hủy booking." });

            return Ok(new { success = true, message = "Hủy booking thành công" });
        }

        // GET /api/bookings/my
        [HttpGet("my")]
        public async Task<IActionResult> GetMyBookings()
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập" });

            var result = await _bookingService.GetUserBookingsAsync(userId.Value);
            return Ok(new { success = true, total = result.Count, data = result });
        }

        // GET /api/bookings/my/profile
        [HttpGet("my/profile")]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập" });

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

        // GET /api/bookings/my/orders
        [HttpGet("my/orders")]
        public async Task<IActionResult> GetMyOrders()
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập" });

            var result = await _bookingService.GetUserOrdersAsync(userId.Value);
            return Ok(new { success = true, total = result.Count, data = result });
        }

        // GET /api/bookings/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetBookingById(int id)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập" });

            var result = await _bookingService.GetBookingByIdAsync(id, userId.Value);
            if (result == null)
                return NotFound(new { success = false, message = "Không tìm thấy booking" });

            return Ok(new { success = true, data = result });
        }

        // POST /api/bookings/validate-voucher
        [HttpPost("validate-voucher")]
        public async Task<IActionResult> ValidateVoucher([FromBody] ValidateVoucherRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Code))
                return BadRequest(new { message = "Vui lòng nhập mã voucher" });

            var result = await _bookingService.ValidateVoucherAsync(req.Code, req.TotalAmount);
            return Ok(new { success = result.IsValid, data = result });
        }
    }

    public class ValidateVoucherRequest
    {
        public string Code { get; set; } = "";
        public decimal TotalAmount { get; set; }
    }
}