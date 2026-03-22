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
    public IActionResult Login()
    {
        var role = HttpContext.Session.GetString("UserRole");
        if (!string.IsNullOrEmpty(role))
            return RedirectByRole(role);
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Login(string phone, string password)
    {
        var body = JsonSerializer.Serialize(new { phone, password });
        var content = new StringContent(body, Encoding.UTF8, "application/json");

        HttpResponseMessage res;
        try
        {
            res = await _http.PostAsync($"{_api}/Auth/login", content);
        }
        catch (Exception ex)
        {
            ViewBag.Error = $"Không kết nối được server: {ex.Message}";
            return View();
        }

        if (res.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            ViewBag.Error = "Tài khoản đã bị khóa. Liên hệ quản trị viên!";
            return View();
        }

        if (!res.IsSuccessStatusCode)
        {
            ViewBag.Error = "Số điện thoại hoặc mật khẩu không chính xác!";
            return View();
        }

        var json = await res.Content.ReadAsStringAsync();
        JsonElement data;
        try { data = JsonSerializer.Deserialize<JsonElement>(json); }
        catch { ViewBag.Error = "Phản hồi không hợp lệ từ server!"; return View(); }

        var token = data.GetProperty("token").GetString() ?? "";
        var user = data.GetProperty("user");
        var role = user.GetProperty("role").GetString() ?? "";
        var fullName = user.GetProperty("fullName").GetString() ?? "";
        var userId = user.GetProperty("id").GetInt32();

        HttpContext.Session.SetString("AuthToken", token);
        HttpContext.Session.SetString("UserRole", role);
        HttpContext.Session.SetString("UserName", fullName);
        HttpContext.Session.SetString("UserId", userId.ToString());

        if (user.TryGetProperty("phone", out var p))
            HttpContext.Session.SetString("UserPhone", p.GetString() ?? "");
        if (user.TryGetProperty("email", out var e))
            HttpContext.Session.SetString("UserEmail", e.GetString() ?? "");
        if (user.TryGetProperty("loyaltyPoints", out var lp))
            HttpContext.Session.SetString("LoyaltyPoints", lp.GetInt32().ToString());
        if (user.TryGetProperty("branchId", out var br) && br.ValueKind != JsonValueKind.Null)
            HttpContext.Session.SetString("BranchId", br.GetInt32().ToString());

        return RedirectByRole(role);
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
            try { ViewBag.Error = JsonSerializer.Deserialize<JsonElement>(await res.Content.ReadAsStringAsync()).GetProperty("message").GetString(); }
            catch { ViewBag.Error = "Đăng ký thất bại!"; }
            return View();
        }
        ViewBag.Success = "Đăng ký thành công! Bạn có thể đăng nhập ngay.";
        return View();
    }

    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Login");
    }

    public IActionResult AccessDenied() => View();

    private IActionResult RedirectByRole(string role) => role switch
    {
        "Admin" => RedirectToAction("AccountManager", "Admin"),
        "Staff" => RedirectToAction("Schedule", "Staff"),
        _ => RedirectToAction("Index", "User")
    };
}