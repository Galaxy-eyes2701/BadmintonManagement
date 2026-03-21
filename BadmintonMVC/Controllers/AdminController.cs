using Microsoft.AspNetCore.Mvc;

public class AdminController : Controller
{
    public IActionResult AccountManager() => View();
    public IActionResult BranchCourt() => View();
    public IActionResult Pricing() => View();
    public IActionResult Vouchers() => View();
    public IActionResult Revenue() => View();
    public IActionResult Bookings() => View();
    [HttpGet("/admin/login")]
    public IActionResult Login()
    {
        // Nếu đã login rồi thì vào thẳng
        if (HttpContext.Session.GetString("UserRole") == "Admin")
            return RedirectToAction("AccountManager");
        return View();
    }
    [HttpPost("/admin/login")]
    public async Task<IActionResult> Login(string username, string password)
    {
        if (username == "admin" && password == "admin")
        {
            HttpContext.Session.SetString("AuthToken", "admin-demo");
            HttpContext.Session.SetString("UserRole", "Admin");
            HttpContext.Session.SetString("UserName", "Admin");
            return RedirectToAction("AccountManager");
        }
        ViewBag.Error = "Sai tài khoản hoặc mật khẩu!";
        return View();
    }
}