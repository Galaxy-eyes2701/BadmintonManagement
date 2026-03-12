using backend.Dtos.Admin;
using backend.DTOs;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    public class AdminUserController : ControllerBase
    {
        private readonly IAdminUserRepository _repo;
        public AdminUserController(IAdminUserRepository repo) => _repo = repo;

        // GET /api/admin/users?role=staff|customer
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? role)
        {
            var users = string.IsNullOrEmpty(role)
                ? await _repo.GetAllUsersAsync()
                : await _repo.GetUsersByRoleAsync(role);

            return Ok(users.Select(ToDto));
        }

        // GET /api/admin/users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _repo.GetUserByIdAsync(id);
            return user is null ? NotFound() : Ok(ToDto(user));
        }

        // POST /api/admin/users — tạo Staff
        [HttpPost]
        public async Task<IActionResult> CreateStaff([FromBody] CreateStaffDto dto)
        {
            if (await _repo.PhoneExistsAsync(dto.Phone))
                return Conflict(new { message = "Số điện thoại đã tồn tại." });

            var user = new User
            {
                FullName     = dto.FullName,
                Phone        = dto.Phone,
                Email        = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role         = "staff",
                Status       = "active",
                LoyaltyPoints = 0
            };

            var created = await _repo.CreateUserAsync(user);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, ToDto(created));
        }

        // PATCH /api/admin/users/{id}/toggle-status — khóa / mở khóa
        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(int id)
        {
            var user = await _repo.GetUserByIdAsync(id);
            if (user is null) return NotFound();

            user.Status = user.Status == "active" ? "inactive" : "active";
            await _repo.UpdateUserAsync(user);
            return Ok(ToDto(user));
        }

        // PUT /api/admin/users/{id} — cập nhật thông tin Staff
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateStaffDto dto)
        {
            var user = await _repo.GetUserByIdAsync(id);
            if (user is null) return NotFound();

            // Kiểm tra phone trùng với user khác
            if (user.Phone != dto.Phone && await _repo.PhoneExistsAsync(dto.Phone))
                return Conflict(new { message = "Số điện thoại đã tồn tại." });

            user.FullName     = dto.FullName;
            user.Phone        = dto.Phone;
            user.Email        = dto.Email;

            // Chỉ đổi password nếu có truyền lên
            if (!string.IsNullOrWhiteSpace(dto.Password))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            await _repo.UpdateUserAsync(user);
            return Ok(ToDto(user));
        }

        // PUT /api/admin/users/{id}/customer — cập nhật Customer
        [HttpPut("{id}/customer")]
        public async Task<IActionResult> UpdateCustomer(int id, [FromBody] UpdateCustomerDto dto)
        {
            var user = await _repo.GetUserByIdAsync(id);
            if (user is null) return NotFound();
            if (user.Role != "customer") return BadRequest(new { message = "Không phải tài khoản khách hàng." });

            if (user.Phone != dto.Phone && await _repo.PhoneExistsAsync(dto.Phone))
                return Conflict(new { message = "Số điện thoại đã tồn tại." });

            user.FullName      = dto.FullName;
            user.Phone         = dto.Phone;
            user.Email         = dto.Email;
            user.LoyaltyPoints = dto.LoyaltyPoints ?? user.LoyaltyPoints;

            await _repo.UpdateUserAsync(user);
            return Ok(ToDto(user));
        }

        // DELETE /api/admin/users/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _repo.GetUserByIdAsync(id);
            if (user is null) return NotFound();

            await _repo.DeleteUserAsync(id);
            return NoContent();
        }

        // ── Helper mapper ──
        private static AdminUserResponseDto ToDto(User u) => new()
        {
            Id            = u.Id,
            FullName      = u.FullName,
            Phone         = u.Phone,
            Email         = u.Email,
            Role          = u.Role,
            Status        = u.Status,
            LoyaltyPoints = u.LoyaltyPoints
        };
    }
}