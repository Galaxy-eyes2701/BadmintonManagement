using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using System.Text.Json;
using System.Security.Claims;
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

        // GET: api/users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }
        [HttpPost("exchange-voucher")]
        public async Task<IActionResult> ExchangeVoucher([FromBody] JsonElement body)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized(new { message = "Vui lòng đăng nhập." });

            int userId = int.Parse(userIdClaim);
            int pointsToExchange = body.GetProperty("points").GetInt32();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "Không tìm thấy tài khoản." });

            if ((user.LoyaltyPoints ?? 0) < pointsToExchange)
            {
                return BadRequest(new { message = $"Bạn chỉ có {user.LoyaltyPoints ?? 0} điểm, không đủ để đổi gói này!" });
            }

            user.LoyaltyPoints -= pointsToExchange;

            decimal discountAmount = pointsToExchange * 1000;
            string randomStr = Guid.NewGuid().ToString().Substring(0, 4).ToUpper();

            // ✨ MẸO Ở ĐÂY: Ta nhúng "-U{userId}-" vào trong mã để đánh dấu chủ sở hữu
            // Ví dụ khách có ID là 5, mã sẽ sinh ra là: FPT50K-U5-ABCD
            string newCode = $"FPT{pointsToExchange}K-U{userId}-{randomStr}";

            var newVoucher = new Voucher
            {
                Code = newCode,
                DiscountAmount = discountAmount,
                UsageLimit = 1,
                ExpiryDate = DateOnly.FromDateTime(DateTime.Now.AddDays(30))
            };

            _context.Vouchers.Add(newVoucher);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi điểm thành công!", code = newCode, remainingPoints = user.LoyaltyPoints });
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