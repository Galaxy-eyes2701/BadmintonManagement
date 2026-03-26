using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using System.Text.Json;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly BadmintonManagementContext _context;

        public UsersController(BadmintonManagementContext context)
        {
            _context = context;
        }

        // =======================================================
        // HÀM TỰ ĐỘNG BÓC TÁCH ID NGƯỜI DÙNG TỪ TOKEN (ĐÃ FIX LỖI)
        // =======================================================
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
                    c.Type == "sub");

                if (idClaim != null && int.TryParse(idClaim.Value, out int userId))
                    return userId;
            }
            catch { }
            return null;
        }

        // GET: api/users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        // ========================================================
        // API ĐỔI ĐIỂM LẤY MÃ VOUCHER
        // ========================================================
        [HttpPost("exchange-voucher")]
        public async Task<IActionResult> ExchangeVoucher([FromBody] JsonElement body)
        {
            // SỬ DỤNG HÀM TỰ ĐỌC TOKEN ĐỂ LẤY ID (Thay vì dùng User.FindFirst)
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized(new { message = "Vui lòng đăng nhập." });

            // 1. Lấy mã Voucher mà khách muốn đổi từ Frontend
            if (!body.TryGetProperty("voucherCode", out var voucherCodeElement))
            {
                return BadRequest(new { message = "Vui lòng chọn mã Voucher muốn đổi!" });
            }
            string targetVoucherCode = voucherCodeElement.GetString();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "Không tìm thấy tài khoản." });

            // 2. Tìm mã gốc trong Database
            var baseVoucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == targetVoucherCode);
            if (baseVoucher == null) return NotFound(new { message = "Mã voucher này không tồn tại trong hệ thống." });
            if (baseVoucher.Code.Contains("-U")) return BadRequest(new { message = "Bạn không thể đổi mã cá nhân của người khác." });

            // 3. Quy đổi: Giảm 1.000đ = Cần 1 điểm
            int pointsRequired = (int)(baseVoucher.DiscountAmount / 1000);

            // 4. Kiểm tra xem khách có đủ điểm không
            if ((user.LoyaltyPoints ?? 0) < pointsRequired)
            {
                return BadRequest(new { message = $"Bạn cần {pointsRequired} điểm để đổi mã {baseVoucher.Code}, nhưng bạn chỉ có {user.LoyaltyPoints ?? 0} điểm!" });
            }

            // 5. Trừ điểm của khách
            user.LoyaltyPoints -= pointsRequired;

            // 6. Tạo mã cá nhân hóa riêng cho khách đó
            string randomStr = Guid.NewGuid().ToString().Substring(0, 4).ToUpper();
            string newPersonalCode = $"{baseVoucher.Code}-U{userId}-{randomStr}";

            var newVoucher = new Voucher
            {
                Code = newPersonalCode,
                DiscountAmount = baseVoucher.DiscountAmount,
                UsageLimit = 1,
                ExpiryDate = DateOnly.FromDateTime(DateTime.Now.AddDays(30))
            };

            _context.Vouchers.Add(newVoucher);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Đổi thành công mã {baseVoucher.Code}!",
                code = newPersonalCode,
                remainingPoints = user.LoyaltyPoints
            });
        }

        // GET: api/users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound();

            return user;
        }

        // POST: api/users
        [HttpPost]
        public async Task<ActionResult<User>> CreateUser(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }

        // DELETE: api/users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}