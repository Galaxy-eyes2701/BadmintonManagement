using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using backend.Models;
using backend.DTOs;
using backend.Services;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly BadmintonManagementContext _context;
    private readonly IPasswordService _passwordService;
    private readonly IJwtService _jwtService;

    public AuthController(
        BadmintonManagementContext context,
        IPasswordService passwordService,
        IJwtService jwtService)
    {
        _context = context;
        _passwordService = passwordService;
        _jwtService = jwtService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        if (await _context.Users.AnyAsync(u => u.Phone == registerDto.Phone))
        {
            return BadRequest(new { message = "Số điện thoại này đã được đăng ký!" });
        }

        var user = new User
        {
            FullName = registerDto.FullName,
            Phone = registerDto.Phone,
            Email = registerDto.Email,
            PasswordHash = _passwordService.HashPassword(registerDto.Password),
            Role = "Customer",
            LoyaltyPoints = 0,
            Status = "active" // Đảm bảo tài khoản mới tạo luôn ở trạng thái active
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _jwtService.GenerateToken(user);
        var userDto = MapToDto(user);

        return Ok(new AuthResponseDto { Token = token, User = userDto });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == loginDto.Phone);

        // 1. Kiểm tra sai SĐT hoặc Password
        if (user == null || !_passwordService.VerifyPassword(loginDto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Số điện thoại hoặc mật khẩu không chính xác!" });
        }

        // 2. BẢO MẬT: Kiểm tra xem tài khoản có bị Admin Ban (Khóa) không?
        if (user.Status != "active")
        {
            // Trả về mã lỗi 403 Forbidden thay vì 401
            return StatusCode(403, new { message = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên!" });
        }

        var token = _jwtService.GenerateToken(user);
        var userDto = MapToDto(user);

        return Ok(new AuthResponseDto { Token = token, User = userDto });
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordDto forgotPasswordDto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == forgotPasswordDto.Phone);

        // BẢO MẬT: Không nên cho tài khoản bị khóa lấy lại mật khẩu
        if (user == null || user.Status != "active")
        {
            return Ok(new { message = "Nếu số điện thoại tồn tại và đang hoạt động, mã xác nhận sẽ được gửi." });
        }

        var resetToken = _jwtService.GeneratePasswordResetToken(user);

        return Ok(new
        {
            message = "Mã khôi phục mật khẩu đã được tạo.",
            token = resetToken,
            phone = user.Phone
        });
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordDto resetPasswordDto)
    {
        try
        {
            var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var token = tokenHandler.ReadJwtToken(resetPasswordDto.Token);

            var purpose = token.Claims.FirstOrDefault(c => c.Type == "purpose")?.Value;
            if (purpose != "password_reset")
            {
                return BadRequest(new { message = "Token không hợp lệ!" });
            }

            var userId = int.Parse(token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value!);
            var user = await _context.Users.FindAsync(userId);

            if (user == null || user.Phone != resetPasswordDto.Phone)
            {
                return BadRequest(new { message = "Token hoặc Số điện thoại không hợp lệ!" });
            }

            // Chặn luôn tài khoản bị khóa đổi pass
            if (user.Status != "active")
            {
                return StatusCode(403, new { message = "Tài khoản đã bị khóa, không thể đổi mật khẩu!" });
            }

            user.PasswordHash = _passwordService.HashPassword(resetPasswordDto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đặt lại mật khẩu thành công!" });
        }
        catch (Exception)
        {
            return BadRequest(new { message = "Token không hợp lệ hoặc đã hết hạn!" });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!);
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            return NotFound();
        }

        // BẢO MẬT: Nếu đang dùng App mà bị Admin Ban giữa chừng, đá văng luôn!
        if (user.Status != "active")
        {
            return StatusCode(403, new { message = "Tài khoản của bạn đã bị khóa!" });
        }

        return Ok(MapToDto(user));
    }

    private static UserDto MapToDto(User user)
    {
        // Gắn thêm BranchId để Frontend biết Staff này đang làm ở Chi nhánh nào
        return new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Phone = user.Phone,
            Email = user.Email,
            Role = user.Role,
            LoyaltyPoints = user.LoyaltyPoints,

            // TÙY CHỌN: Nếu class UserDto của anh trong DTOs/AuthDto.cs chưa có 2 trường này, 
            // anh mở file đó ra và thêm `public string? Status { get; set; }` 
            // và `public int? BranchId { get; set; }` vào nhé!
            // Status = user.Status,
            // BranchId = user.BranchId
        };
    }
}