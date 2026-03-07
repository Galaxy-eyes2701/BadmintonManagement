namespace backend.DTOs;

public class RegisterDto
{
    public string FullName { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string? Email { get; set; }
}

public class LoginDto
{
    public string Phone { get; set; } = null!;
    public string Password { get; set; } = null!;
}

public class ForgotPasswordDto
{
    public string Phone { get; set; } = null!;
}

public class ResetPasswordDto
{
    public string Phone { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
    public string Token { get; set; } = null!;
}

public class AuthResponseDto
{
    public string Token { get; set; } = null!;
    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string? Email { get; set; }
    public string Role { get; set; } = null!;
    public int? LoyaltyPoints { get; set; }
}
