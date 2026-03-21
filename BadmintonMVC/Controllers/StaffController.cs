using Microsoft.AspNetCore.Mvc;

public class StaffController : Controller
{
    private readonly string _api;
    private readonly HttpClient _http;

    public StaffController(IConfiguration config)
    {
        _api = config["BackendApi"] + "/api";
        _http = new HttpClient();
    }

    // Thêm token vào mỗi request
    private void SetToken()
    {
        var token = HttpContext.Session.GetString("AuthToken");
        _http.DefaultRequestHeaders.Authorization = null;
        if (!string.IsNullOrEmpty(token))
            _http.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }

    // GET /Staff/Schedule
    public IActionResult Schedule() => View();

    // GET /Staff/Bookings
    public IActionResult Bookings() => View();

    // GET /Staff/FixedSchedule
    public IActionResult FixedSchedule() => View();

    // GET /Staff/Pos
    public IActionResult Pos() => View();

    public IActionResult Products() => View();
    public IActionResult PaymentResult() => View();  // ← THÊM DÒNG NÀY

}