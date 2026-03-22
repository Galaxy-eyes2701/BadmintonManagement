using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace BadmintonMVC.Controllers;

public class StaffController : Controller
{
    private readonly string _api;
    private readonly HttpClient _http = new();

    public StaffController(IConfiguration config)
    {
        _api = config["BackendApi"] + "/api";
    }

    // ── AUTH GUARD ────────────────────────────────────────────
    // Dùng Session như AuthController — không cần Cookie Auth
    private IActionResult? CheckStaff()
    {
        var role = HttpContext.Session.GetString("UserRole");
        if (string.IsNullOrEmpty(role))
            return RedirectToAction("Login", "Auth");
        if (role != "Staff" && role != "Admin")
            return RedirectToAction("Login", "Auth");
        return null;
    }

    private string Token => HttpContext.Session.GetString("AuthToken") ?? "";

    private HttpClient GetHttp()
    {
        _http.DefaultRequestHeaders.Authorization = null;
        if (!string.IsNullOrEmpty(Token))
            _http.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", Token);
        return _http;
    }

    // ── SCHEDULE ──────────────────────────────────────────────
    public IActionResult Schedule()
    {
        var guard = CheckStaff();
        if (guard != null) return guard;
        return View();
    }

    public IActionResult Bookings()
    {
        var guard = CheckStaff();
        if (guard != null) return guard;
        return View();
    }

    public IActionResult FixedSchedule()
    {
        var guard = CheckStaff();
        if (guard != null) return guard;
        return View();
    }

    public IActionResult Pos()
    {
        var guard = CheckStaff();
        if (guard != null) return guard;
        return View();
    }

    public IActionResult Products()
    {
        var guard = CheckStaff();
        if (guard != null) return guard;
        return View();
    }

    public IActionResult PaymentResult()
    {
        var guard = CheckStaff();
        if (guard != null) return guard;
        return View();
    }
}