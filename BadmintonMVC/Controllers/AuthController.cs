using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

public class AuthController : Controller
{
    private readonly string _api;
    private readonly HttpClient _http = new();

    public AuthController(IConfiguration config)
    {
        _api = config["BackendApi"] + "/api";
    }

    [HttpGet]
    public IActionResult Login() => View();

    [HttpPost]
    public async Task<IActionResult> Login(string phone, string password)
    {
        var body = JsonSerializer.Serialize(new { phone, password });
        var content = new StringContent(body, Encoding.UTF8, "application/json");
        var res = await _http.PostAsync($"{_api}/Auth/login", content);

        if (res.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            ViewBag.Error = "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ Quản trị viên!";
            return View();
        }

        if (!res.IsSuccessStatusCode)
        {
            ViewBag.Error = "Số điện thoại hoặc mật khẩu không chính xác!";
            return View();
        }

        var json = await res.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(json);

        var token = data.GetProperty("token").GetString();
        var user = data.GetProperty("user");
        var role = user.GetProperty("role").GetString();
        var fullName = user.GetProperty("fullName").GetString();
        var userId = user.GetProperty("id").GetInt32();

        // Store user info in session
        HttpContext.Session.SetString("AuthToken", token!);
        HttpContext.Session.SetString("UserRole", role!);
        HttpContext.Session.SetString("UserName", fullName!);
        HttpContext.Session.SetString("UserId", userId.ToString());

        // Store phone and email for profile display
        if (user.TryGetProperty("phone", out var phoneEl))
        {
            HttpContext.Session.SetString("UserPhone", phoneEl.GetString() ?? "");
        }
        if (user.TryGetProperty("email", out var emailEl))
        {
            HttpContext.Session.SetString("UserEmail", emailEl.GetString() ?? "");
        }

        // Also store loyalty points if available
        if (user.TryGetProperty("loyaltyPoints", out var pointsEl))
        {
            HttpContext.Session.SetString("LoyaltyPoints", pointsEl.GetInt32().ToString());
        }

        return role switch
        {
            "Admin" => RedirectToAction("AccountManager", "Admin"),
            "Staff" => RedirectToAction("Schedule", "Staff"),
            _ => RedirectToAction("Index", "User")
        };
    }

    [HttpGet]
    public IActionResult Register() => View();

    [HttpPost]
    public async Task<IActionResult> Register(string fullName, string phone, string email, string password, string confirmPassword)
    {
        if (password != confirmPassword)
        {
            ViewBag.Error = "Mật khẩu xác nhận không khớp!";
            return View();
        }

        var body = JsonSerializer.Serialize(new { fullName, phone, email, password });
        var content = new StringContent(body, Encoding.UTF8, "application/json");
        var res = await _http.PostAsync($"{_api}/Auth/register", content);

        if (!res.IsSuccessStatusCode)
        {
            var errorJson = await res.Content.ReadAsStringAsync();
            try
            {
                var errorData = JsonSerializer.Deserialize<JsonElement>(errorJson);
                ViewBag.Error = errorData.GetProperty("message").GetString() ?? "Đăng ký thất bại!";
            }
            catch
            {
                ViewBag.Error = "Đăng ký thất bại. Vui lòng thử lại!";
            }
            return View();
        }

        ViewBag.Success = "Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.";
        return View();
    }

    [HttpGet]
    public IActionResult ForgotPassword() => View();

    [HttpPost]
    public async Task<IActionResult> ForgotPassword(string phone)
    {
        if (string.IsNullOrEmpty(phone))
        {
            ViewBag.Error = "Vui lòng nhập số điện thoại!";
            return View();
        }

        var body = JsonSerializer.Serialize(new { phone });
        var content = new StringContent(body, Encoding.UTF8, "application/json");
        var res = await _http.PostAsync($"{_api}/Auth/forgot-password", content);

        // Always show success message for security (don't reveal if phone exists)
        ViewBag.Success = "Nếu số điện thoại tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi cho bạn.";
        return View();
    }

    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Login");
    }
}