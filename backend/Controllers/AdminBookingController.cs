using System.Threading.Tasks;
using backend.Dtos.Admin;
using backend.Interface.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/admin/bookings")]
    public class AdminBookingController : ControllerBase
    {
        private readonly IAdminBookingService _service;

        public AdminBookingController(IAdminBookingService service) => _service = service;

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/bookings
        // Query: status, branchId, fromDate, toDate, search, page, pageSize
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] AdminBookingFilterDto filter)
        {
            var result = await _service.GetAllAsync(filter);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/bookings/{id}
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null)
                return NotFound(new { message = $"Không tìm thấy booking #{id}" });

            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // PATCH /api/admin/bookings/{id}/status
        // Body: { "status": "confirmed" | "cancelled", "note": "..." }
        // ──────────────────────────────────────────────────────────────────────
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(
            int id, [FromBody] AdminBookingUpdateStatusDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Status))
                return BadRequest(new { message = "Vui lòng cung cấp trạng thái mới." });

            var (success, message) = await _service.UpdateStatusAsync(id, dto);

            if (!success)
                return BadRequest(new { message });

            return Ok(new { message });
        }

        // ──────────────────────────────────────────────────────────────────────
        // PATCH /api/admin/bookings/{id}/confirm   (shortcut)
        // ──────────────────────────────────────────────────────────────────────
        [HttpPatch("{id:int}/confirm")]
        public async Task<IActionResult> Confirm(int id)
        {
            var dto = new AdminBookingUpdateStatusDto { Status = "confirmed" };
            var (success, message) = await _service.UpdateStatusAsync(id, dto);

            if (!success)
                return BadRequest(new { message });

            return Ok(new { message });
        }

        // ──────────────────────────────────────────────────────────────────────
        // PATCH /api/admin/bookings/{id}/cancel    (shortcut)
        // ──────────────────────────────────────────────────────────────────────
        [HttpPatch("{id:int}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            var dto = new AdminBookingUpdateStatusDto { Status = "cancelled" };
            var (success, message) = await _service.UpdateStatusAsync(id, dto);

            if (!success)
                return BadRequest(new { message });

            return Ok(new { message });
        }
    }
}