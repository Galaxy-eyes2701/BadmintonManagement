using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
    private readonly EmailService _emailService;
    private readonly IMemoryCache _cache;

    public AuthController(
        BadmintonManagementContext context,
        IPasswordService passwordService,
        IJwtService jwtService,
        EmailService emailService,
        IMemoryCache cache)
    {
        _context = context;
        _passwordService = passwordService;
        _jwtService = jwtService;
        _emailService = emailService;
        _cache = cache;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        if (await _context.Users.AnyAsync(u => u.Phone == registerDto.Phone))
        {
            return BadRequest(new { message = "Số điện thoại này đã được đăng ký!" });
        }

        if (!string.IsNullOrWhiteSpace(registerDto.Email) &&
            await _context.Users.AnyAsync(u => u.Email == registerDto.Email.Trim()))
        {
            return BadRequest(new { message = "Email này đã được sử dụng bởi tài khoản khác!" });
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

    [HttpPost("forgot-password-by-email")]
    public async Task<ActionResult> ForgotPasswordByEmail([FromBody] ForgotPasswordByEmailDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

        // Luôn trả về 200 để tránh lộ thông tin email có tồn tại không
        if (user == null || user.Status != "active")
            return Ok(new { message = "Nếu email tồn tại, mã OTP sẽ được gửi." });

        // Tạo OTP 6 số
        var otp = new Random().Next(100000, 999999).ToString();
        var cacheKey = $"otp_{dto.Email}";

        // Lưu OTP vào cache 10 phút
        _cache.Set(cacheKey, new OtpEntry { Otp = otp, Phone = user.Phone },
            TimeSpan.FromMinutes(10));

        // Gửi email
        var html = $@"
            <div style='font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e2e8f0'>
                <div style='text-align:center;margin-bottom:24px'>
                    <span style='font-size:48px'>🏸</span>
                    <h2 style='color:#0f766e;margin:8px 0 0'>Badminton Management</h2>
                </div>
                <p style='color:#374151'>Xin chào <strong>{user.FullName}</strong>,</p>
                <p style='color:#374151'>Bạn vừa yêu cầu đặt lại mật khẩu. Mã OTP của bạn là:</p>
                <div style='text-align:center;margin:24px 0'>
                    <span style='font-size:36px;font-weight:900;letter-spacing:8px;color:#0f766e;
                                 background:#ecfdf5;padding:16px 32px;border-radius:12px;display:inline-block'>
                        {otp}
                    </span>
                </div>
                <p style='color:#64748b;font-size:14px'>Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
                <p style='color:#64748b;font-size:14px'>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
            </div>";

        try
        {
            await _emailService.SendEmailAsync(dto.Email, "🔐 Mã OTP đặt lại mật khẩu", html);
        }
        catch
        {
            return StatusCode(500, new { message = "Không thể gửi email. Vui lòng thử lại sau." });
        }

        return Ok(new { message = "Mã OTP đã được gửi đến email của bạn." });
    }

    [HttpPost("verify-otp-reset")]
    public async Task<ActionResult> VerifyOtpAndReset([FromBody] VerifyOtpResetDto dto)
    {
        var cacheKey = $"otp_{dto.Email}";

        if (!_cache.TryGetValue(cacheKey, out OtpEntry? entry) || entry == null)
            return BadRequest(new { message = "Mã OTP đã hết hạn hoặc không hợp lệ!" });

        if (entry.Otp != dto.Otp)
            return BadRequest(new { message = "Mã OTP không đúng!" });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == entry.Phone);
        if (user == null || user.Status != "active")
            return BadRequest(new { message = "Tài khoản không hợp lệ!" });

        user.PasswordHash = _passwordService.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();

        // Xóa OTP sau khi dùng
        _cache.Remove(cacheKey);

        return Ok(new { message = "Đặt lại mật khẩu thành công!" });
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

    [HttpPut("me/update")]
    public async Task<IActionResult> UpdateProfileNoAuth([FromBody] UpdateProfileWithIdDto dto)
    {
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null) return NotFound(new { message = "Người dùng không tồn tại!" });
        if (user.Status != "active") return StatusCode(403, new { message = "Tài khoản đã bị khóa!" });

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var emailExists = await _context.Users
                .AnyAsync(u => u.Email == dto.Email.Trim() && u.Id != dto.UserId);
            if (emailExists)
                return BadRequest(new { message = "Email này đã được sử dụng bởi tài khoản khác!" });
        }

        if (!string.IsNullOrWhiteSpace(dto.Phone))
        {
            var phoneExists = await _context.Users
                .AnyAsync(u => u.Phone == dto.Phone.Trim() && u.Id != dto.UserId);
            if (phoneExists)
                return BadRequest(new { message = "Số điện thoại này đã được sử dụng bởi tài khoản khác!" });
        }

        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email))    user.Email    = dto.Email.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Phone))    user.Phone    = dto.Phone.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Cập nhật thành công!", data = MapToDto(user) });
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value!);
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();
        if (user.Status != "active") return StatusCode(403, new { message = "Tài khoản đã bị khóa!" });

        // Validate trùng email
        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var emailExists = await _context.Users
                .AnyAsync(u => u.Email == dto.Email.Trim() && u.Id != userId);
            if (emailExists)
                return BadRequest(new { message = "Email này đã được sử dụng bởi tài khoản khác!" });
        }

        // Validate trùng số điện thoại
        if (!string.IsNullOrWhiteSpace(dto.Phone))
        {
            var phoneExists = await _context.Users
                .AnyAsync(u => u.Phone == dto.Phone.Trim() && u.Id != userId);
            if (phoneExists)
                return BadRequest(new { message = "Số điện thoại này đã được sử dụng bởi tài khoản khác!" });
        }

        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email))    user.Email    = dto.Email.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Phone))    user.Phone    = dto.Phone.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Cập nhật thành công!", data = MapToDto(user) });
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