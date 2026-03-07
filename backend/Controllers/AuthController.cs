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
            return BadRequest(new { message = "Phone number already registered" });
        }

        var user = new User
        {
            FullName = registerDto.FullName,
            Phone = registerDto.Phone,
            Email = registerDto.Email,
            PasswordHash = _passwordService.HashPassword(registerDto.Password),
            Role = "Customer",
            LoyaltyPoints = 0
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

        if (user == null || !_passwordService.VerifyPassword(loginDto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid phone or password" });
        }

        var token = _jwtService.GenerateToken(user);
        var userDto = MapToDto(user);

        return Ok(new AuthResponseDto { Token = token, User = userDto });
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordDto forgotPasswordDto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Phone == forgotPasswordDto.Phone);

        if (user == null)
        {
            return Ok(new { message = "If the phone number exists, a reset token will be sent" });
        }

        var resetToken = _jwtService.GeneratePasswordResetToken(user);

        return Ok(new { 
            message = "Password reset token generated",
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
                return BadRequest(new { message = "Invalid token" });
            }

            var userId = int.Parse(token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value!);
            var user = await _context.Users.FindAsync(userId);

            if (user == null || user.Phone != resetPasswordDto.Phone)
            {
                return BadRequest(new { message = "Invalid token or phone" });
            }

            user.PasswordHash = _passwordService.HashPassword(resetPasswordDto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully" });
        }
        catch (Exception)
        {
            return BadRequest(new { message = "Invalid or expired token" });
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

        return Ok(MapToDto(user));
    }

    private static UserDto MapToDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Phone = user.Phone,
            Email = user.Email,
            Role = user.Role,
            LoyaltyPoints = user.LoyaltyPoints
        };
    }
}
