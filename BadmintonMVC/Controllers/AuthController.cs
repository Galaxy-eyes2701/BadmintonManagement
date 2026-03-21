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

        if (!res.IsSuccessStatusCode)
        {
            ViewBag.Error = "Sai số điện thoại hoặc mật khẩu!";
            return View();
        }

        var json = await res.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(json);

        var token = data.GetProperty("token").GetString();
        var user = data.GetProperty("user");
        var role = user.GetProperty("role").GetString();
        var fullName = user.GetProperty("fullName").GetString();

        HttpContext.Session.SetString("AuthToken", token!);
        HttpContext.Session.SetString("UserRole", role!);
        HttpContext.Session.SetString("UserName", fullName!);

        return role switch
        {
            "Admin" => RedirectToAction("AccountManager", "Admin"),
            "Staff" => RedirectToAction("Schedule", "Staff"),
            _ => RedirectToAction("Index", "Home")
        };
    }

    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Login");
    }
}