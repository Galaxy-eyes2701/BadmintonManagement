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

        // ── Role constants — đổi ở đây 1 lần, áp dụng toàn bộ ──
        private const string ROLE_ADMIN    = "Admin";
        private const string ROLE_STAFF    = "Staff";
        private const string ROLE_CUSTOMER = "Customer";

        private const string STATUS_ACTIVE   = "active";
        private const string STATUS_INACTIVE = "inactive";

        // ── Normalize: "STAFF" / "staff" / "Staff" → "Staff" ──
        private static string NormalizeRole(string role) => role.Trim() switch
        {
            var r when r.Equals("admin",    StringComparison.OrdinalIgnoreCase) => ROLE_ADMIN,
            var r when r.Equals("staff",    StringComparison.OrdinalIgnoreCase) => ROLE_STAFF,
            var r when r.Equals("customer", StringComparison.OrdinalIgnoreCase) => ROLE_CUSTOMER,
            _ => role // giữ nguyên nếu không nhận ra
        };

        // GET /api/admin/users?role=staff|Staff|STAFF (tất cả đều hoạt động)
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? role)
        {
            IEnumerable<User> users;

            if (string.IsNullOrEmpty(role))
            {
                users = await _repo.GetAllUsersAsync();
            }
            else
            {
                // Normalize trước khi query → không bị lỗi dù frontend gõ gì
                var normalizedRole = NormalizeRole(role);
                users = await _repo.GetUsersByRoleAsync(normalizedRole);
            }

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
                FullName      = dto.FullName,
                Phone         = dto.Phone,
                Email         = dto.Email,
                PasswordHash  = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role          = ROLE_STAFF,   // ← luôn đúng, không hard-code string
                Status        = STATUS_ACTIVE,
                LoyaltyPoints = 0
            };

            var created = await _repo.CreateUserAsync(user);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, ToDto(created));
        }

        // PATCH /api/admin/users/{id}/toggle-status
        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(int id)
        {
            var user = await _repo.GetUserByIdAsync(id);
            if (user is null) return NotFound();

            user.Status = user.Status.Equals(STATUS_ACTIVE, StringComparison.OrdinalIgnoreCase)
                ? STATUS_INACTIVE
                : STATUS_ACTIVE;

            await _repo.UpdateUserAsync(user);
            return Ok(ToDto(user));
        }

        // PUT /api/admin/users/{id} — cập nhật Staff
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateStaffDto dto)
        {
            var user = await _repo.GetUserByIdAsync(id);
            if (user is null) return NotFound();

            if (user.Phone != dto.Phone && await _repo.PhoneExistsAsync(dto.Phone))
                return Conflict(new { message = "Số điện thoại đã tồn tại." });

            user.FullName = dto.FullName;
            user.Phone    = dto.Phone;
            user.Email    = dto.Email;

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

            // So sánh case-insensitive → "customer" / "Customer" đều pass
            if (!user.Role.Equals(ROLE_CUSTOMER, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Không phải tài khoản khách hàng." });

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