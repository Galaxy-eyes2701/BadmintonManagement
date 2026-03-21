using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace BadmintonMVC.Controllers;

public class UserController : Controller
{
    private readonly string _api;
    private readonly HttpClient _http = new();

    public UserController(IConfiguration config)
    {
        _api = config["BackendApi"] + "/api";
    }

    // Check if user is authenticated
    private bool IsAuthenticated()
    {
        return !string.IsNullOrEmpty(HttpContext.Session.GetString("AuthToken"));
    }

    // Get display name for header
    private string GetDisplayName()
    {
        return HttpContext.Session.GetString("UserName") ?? "Khách";
    }

    // Get auth header
    private (HttpClient client, string token) GetAuthClient()
    {
        var token = HttpContext.Session.GetString("AuthToken");
        var client = new HttpClient();
        if (!string.IsNullOrEmpty(token))
        {
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }
        return (client, token);
    }

    // GET: User Index (Home Page)
    [HttpGet]
    public IActionResult Index()
    {
        ViewBag.IsAuthenticated = IsAuthenticated();
        ViewBag.DisplayName = GetDisplayName();
        return View();
    }

    // GET: User Profile
    [HttpGet]
    public async Task<IActionResult> Profile()
    {
        if (!IsAuthenticated())
        {
            return RedirectToAction("Login", "Auth");
        }

        var token = HttpContext.Session.GetString("AuthToken");
        var userId = HttpContext.Session.GetString("UserId");

        using var client = new HttpClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        try
        {
            // Get user profile from API
            var response = await client.GetAsync($"{_api}/Auth/me");

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var userData = JsonSerializer.Deserialize<JsonElement>(json);

                ViewBag.Profile = userData;
                ViewBag.DisplayName = GetDisplayName();
                ViewBag.LoyaltyPoints = HttpContext.Session.GetString("LoyaltyPoints") ?? "0";

                return View();
            }
        }
        catch
        {
            // If API fails, use session data
        }

        // Fallback to session data
        ViewBag.DisplayName = GetDisplayName();
        ViewBag.LoyaltyPoints = HttpContext.Session.GetString("LoyaltyPoints") ?? "0";
        return View();
    }

    // GET: User Booking (Step 1 - Select Date & Filters)
    [HttpGet]
    public async Task<IActionResult> Booking()
    {
        if (!IsAuthenticated())
        {
            return RedirectToAction("Login", "Auth");
        }

        ViewBag.DisplayName = GetDisplayName();

        // Load branches and court types for filters
        try
        {
            var branchesJson = await _http.GetStringAsync($"{_api}/branches");
            var courtTypesJson = await _http.GetStringAsync($"{_api}/courttypes");
            
            ViewBag.Branches = JsonSerializer.Deserialize<JsonElement>(branchesJson);
            ViewBag.CourtTypes = JsonSerializer.Deserialize<JsonElement>(courtTypesJson);
        }
        catch
        {
            ViewBag.Branches = null;
            ViewBag.CourtTypes = null;
        }

        return View();
    }

    // POST: User Booking - Search Available Courts (Step 1 -> Step 2)
    [HttpPost]
    public async Task<IActionResult> SearchCourts(string selectedDate, string? branchId, string? courtTypeId)
    {
        if (!IsAuthenticated())
        {
            return RedirectToAction("Login", "Auth");
        }

        var (client, token) = GetAuthClient();

        var queryParams = new List<string> { $"date={selectedDate}" };
        if (!string.IsNullOrEmpty(branchId)) queryParams.Add($"branchId={branchId}");
        if (!string.IsNullOrEmpty(courtTypeId)) queryParams.Add($"courtTypeId={courtTypeId}");

        try
        {
            var response = await client.GetAsync($"{_api}/bookings/available-courts?{string.Join("&", queryParams)}");
            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(json);

            ViewBag.Courts = data.GetProperty("data");
            ViewBag.SelectedDate = selectedDate;
            ViewBag.BranchId = branchId;
            ViewBag.CourtTypeId = courtTypeId;
            ViewBag.DisplayName = GetDisplayName();

            // Reload filters
            var branchesJson = await _http.GetStringAsync($"{_api}/branches");
            var courtTypesJson = await _http.GetStringAsync($"{_api}/courttypes");
            ViewBag.Branches = JsonSerializer.Deserialize<JsonElement>(branchesJson);
            ViewBag.CourtTypes = JsonSerializer.Deserialize<JsonElement>(courtTypesJson);

            return View("BookingStep2");
        }
        catch (Exception ex)
        {
            ViewBag.Error = "Không thể tải danh sách sân: " + ex.Message;
            return View("Booking");
        }
    }

    // POST: User Booking - Confirm Booking (Step 3)
    [HttpPost]
    public async Task<IActionResult> ConfirmBooking(string slotsJson, string? voucherCode)
    {
        if (!IsAuthenticated())
        {
            return RedirectToAction("Login", "Auth");
        }

        var (client, token) = GetAuthClient();

        try
        {
            // Parse slots
            var slots = JsonSerializer.Deserialize<List<SlotItem>>(slotsJson);

            var payload = new
            {
                slots = slots.Select(s => new { s.courtId, s.timeSlotId, s.playDate }),
                voucherCode = !string.IsNullOrEmpty(voucherCode) ? voucherCode : null,
                paymentMethod = "CASH"
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{_api}/bookings", content);
            var json = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var data = JsonSerializer.Deserialize<JsonElement>(json);
                ViewBag.SuccessData = data.GetProperty("data");
                ViewBag.DisplayName = GetDisplayName();
                return View("BookingSuccess");
            }
            else
            {
                var errorData = JsonSerializer.Deserialize<JsonElement>(json);
                ViewBag.Error = errorData.GetProperty("message").GetString() ?? "Đặt sân thất bại";
                return View("Booking");
            }
        }
        catch (Exception ex)
        {
            ViewBag.Error = "Lỗi: " + ex.Message;
            return View("Booking");
        }
    }

    // POST: Validate Voucher
    [HttpPost]
    public async Task<IActionResult> ValidateVoucher(string code, decimal totalAmount)
    {
        if (!IsAuthenticated())
        {
            return Json(new { success = false, message = "Chưa đăng nhập" });
        }

        var (client, token) = GetAuthClient();

        try
        {
            var payload = new { code, totalAmount };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{_api}/bookings/validate-voucher", content);
            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // GET: Confirm Booking Page (Step 3)
    [HttpGet]
    public IActionResult ConfirmBookingPage()
    {
        if (!IsAuthenticated())
        {
            return RedirectToAction("Login", "Auth");
        }

        ViewBag.DisplayName = GetDisplayName();
        return View("ConfirmBooking");
    }

    // POST: Create Deposit Payment
    [HttpPost]
    public async Task<IActionResult> CreateDepositPayment(int bookingId)
    {
        if (!IsAuthenticated())
        {
            return Json(new { success = false, message = "Chưa đăng nhập" });
        }

        var (client, token) = GetAuthClient();

        try
        {
            var payload = new { bookingId };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{_api}/payments/deposit/create", content);
            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(json);

            // Check for error response from backend
            if (data.TryGetProperty("success", out var successEl) && !successEl.GetBoolean())
            {
                var errorMsg = data.TryGetProperty("message", out var msgEl) ? msgEl.GetString() : "Lỗi từ server";
                return Json(new { success = false, message = errorMsg });
            }

            // Check for paymentUrl (case-insensitive)
            string? paymentUrl = null;
            if (data.TryGetProperty("paymentUrl", out var urlEl))
            {
                paymentUrl = urlEl.GetString();
            }
            else if (data.TryGetProperty("PaymentUrl", out urlEl))
            {
                paymentUrl = urlEl.GetString();
            }

            if (!string.IsNullOrEmpty(paymentUrl))
            {
                return Json(new { success = true, paymentUrl = paymentUrl });
            }
            return Json(new { success = false, message = "Không thể tạo thanh toán", debug = json });
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // GET: User History
    [HttpGet]
    public async Task<IActionResult> History(string tab = "bookings", int page = 1, int pageSize = 5)
    {
        if (!IsAuthenticated())
        {
            return RedirectToAction("Login", "Auth");
        }

        var (client, token) = GetAuthClient();
        ViewBag.DisplayName = GetDisplayName();
        ViewBag.Tab = tab;
        ViewBag.CurrentPage = page;
        ViewBag.PageSize = pageSize;

        try
        {
            if (tab == "bookings")
            {
                var response = await client.GetAsync($"{_api}/bookings/my");
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(json);
                
                // Get all bookings and paginate
                var allBookings = data.GetProperty("data");
                var bookingsList = allBookings.EnumerateArray().ToList();
                var totalCount = bookingsList.Count;
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                
                ViewBag.TotalCount = totalCount;
                ViewBag.TotalPages = totalPages;
                ViewBag.Bookings = JsonSerializer.SerializeToElement(bookingsList.Skip((page - 1) * pageSize).Take(pageSize));
            }
            else
            {
                var response = await client.GetAsync($"{_api}/bookings/my/orders");
                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(json);
                
                // Get all orders and paginate
                var allOrders = data.GetProperty("data");
                var ordersList = allOrders.EnumerateArray().ToList();
                var totalCount = ordersList.Count;
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                
                ViewBag.TotalCount = totalCount;
                ViewBag.TotalPages = totalPages;
                ViewBag.Orders = JsonSerializer.SerializeToElement(ordersList.Skip((page - 1) * pageSize).Take(pageSize));
            }
        }
        catch
        {
            ViewBag.Bookings = null;
            ViewBag.Orders = null;
        }

        return View();
    }

    // GET: Booking Detail
    [HttpGet]
    public async Task<IActionResult> BookingDetail(int id)
    {
        if (!IsAuthenticated())
        {
            return Json(new { success = false, message = "Chưa đăng nhập" });
        }

        var (client, token) = GetAuthClient();

        try
        {
            var response = await client.GetAsync($"{_api}/bookings/{id}");
            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // POST: Cancel Booking
    [HttpPost]
    public async Task<IActionResult> CancelBooking(int id)
    {
        if (!IsAuthenticated())
        {
            return Json(new { success = false, message = "Chưa đăng nhập" });
        }

        var (client, token) = GetAuthClient();

        try
        {
            var response = await client.DeleteAsync($"{_api}/bookings/{id}");
            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // GET: Purchase Products (Step 1)
    [HttpGet]
    public async Task<IActionResult> Purchase()
    {
        if (!IsAuthenticated())
        {
            return RedirectToAction("Login", "Auth");
        }

        var (client, token) = GetAuthClient();
        ViewBag.DisplayName = GetDisplayName();

        try
        {
            // Load active bookings for purchase
            var bookingsResponse = await client.GetAsync($"{_api}/bookings/my/active-for-purchase");
            var bookingsJson = await bookingsResponse.Content.ReadAsStringAsync();
            var bookingsData = JsonSerializer.Deserialize<JsonElement>(bookingsJson);
            ViewBag.Bookings = bookingsData.GetProperty("data");

            // Load products
            var productsResponse = await _http.GetAsync($"{_api}/bookings/products");
            var productsJson = await productsResponse.Content.ReadAsStringAsync();
            var productsData = JsonSerializer.Deserialize<JsonElement>(productsJson);
            ViewBag.Products = productsData.GetProperty("data");
        }
        catch
        {
            ViewBag.Bookings = null;
            ViewBag.Products = null;
        }

        return View();
    }

    // POST: Purchase Products - Confirm
    [HttpPost]
    public async Task<IActionResult> ConfirmPurchase(int bookingId, string productsJson)
    {
        if (!IsAuthenticated())
        {
            return Json(new { success = false, message = "Chưa đăng nhập" });
        }

        var (client, token) = GetAuthClient();

        try
        {
            var products = JsonSerializer.Deserialize<List<ProductItem>>(productsJson);
            var payload = new
            {
                bookingId,
                products = products.Select(p => new { p.productId, p.quantity })
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{_api}/bookings/purchase-products", content);
            var json = await response.Content.ReadAsStringAsync();
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // POST: Create Product Payment
    [HttpPost]
    public async Task<IActionResult> CreateProductPayment(int bookingId, decimal amount)
    {
        if (!IsAuthenticated())
        {
            return Json(new { success = false, message = "Chưa đăng nhập" });
        }

        var (client, token) = GetAuthClient();

        try
        {
            var payload = new { bookingId, amount };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{_api}/payments/product/create", content);
            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(json);

            // Check for error response from backend
            if (data.TryGetProperty("success", out var successEl) && !successEl.GetBoolean())
            {
                var errorMsg = data.TryGetProperty("message", out var msgEl) ? msgEl.GetString() : "Lỗi từ server";
                return Json(new { success = false, message = errorMsg });
            }

            // Check for paymentUrl (case-insensitive)
            string? paymentUrl = null;
            if (data.TryGetProperty("paymentUrl", out var urlEl))
            {
                paymentUrl = urlEl.GetString();
            }
            else if (data.TryGetProperty("PaymentUrl", out urlEl))
            {
                paymentUrl = urlEl.GetString();
            }

            if (!string.IsNullOrEmpty(paymentUrl))
            {
                return Json(new { success = true, paymentUrl = paymentUrl });
            }
            return Json(new { success = false, message = "Không thể tạo thanh toán", debug = json });
        }
        catch (Exception ex)
        {
            return Json(new { success = false, message = ex.Message });
        }
    }

    // GET: Payment Result (VNPay Return)
    [HttpGet]
    public async Task<IActionResult> PaymentResult()
    {
        ViewBag.DisplayName = GetDisplayName();

        var queryString = Request.QueryString.ToString();
        if (string.IsNullOrEmpty(queryString))
        {
            ViewBag.Status = "error";
            ViewBag.Message = "Không tìm thấy thông tin giao dịch hợp lệ.";
            return View();
        }

        var txnRef = Request.Query["vnp_TxnRef"].ToString();
        var prefix = txnRef.Split('_')[0];

        try
        {
            var endpoint = prefix switch
            {
                "DEP" => $"{_api}/payments/deposit/vnpay-return",
                "REM" or "PROD" => $"{_api}/payments/remaining/vnpay-return",
                _ => $"{_api}/payments/vnpay-return"
            };

            var response = await _http.GetAsync($"{endpoint}{queryString}");
            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(json);

            // Check for success (case-insensitive)
            bool isSuccess = false;
            if (data.TryGetProperty("success", out var successEl))
                isSuccess = successEl.GetBoolean();
            else if (data.TryGetProperty("Success", out successEl))
                isSuccess = successEl.GetBoolean();

            if (isSuccess)
            {
                ViewBag.Status = "success";
                // Get booking ID (case-insensitive)
                int bookingId = 0;
                if (data.TryGetProperty("bookingId", out var bookingIdEl))
                    bookingId = bookingIdEl.GetInt32();
                else if (data.TryGetProperty("BookingId", out bookingIdEl))
                    bookingId = bookingIdEl.GetInt32();
                
                ViewBag.BookingId = bookingId;
                ViewBag.Amount = int.Parse(Request.Query["vnp_Amount"]) / 100;
                ViewBag.BankCode = Request.Query["vnp_BankCode"].ToString();
                ViewBag.TxnRef = txnRef;
                ViewBag.PaymentType = prefix switch
                {
                    "DEP" => "Đặt cọc 50%",
                    "PROD" => "Thanh toán sản phẩm + sân",
                    "REM" => "Thanh toán phần còn lại",
                    _ => "Thanh toán"
                };

                var payDate = Request.Query["vnp_PayDate"].ToString();
                if (payDate.Length == 14)
                {
                    ViewBag.PayDate = $"{payDate.Substring(8, 2)}:{payDate.Substring(10, 2)}, {payDate.Substring(6, 2)}/{payDate.Substring(4, 2)}/{payDate.Substring(0, 4)}";
                }
                else
                {
                    ViewBag.PayDate = payDate;
                }
            }
            else
            {
                ViewBag.Status = "error";
                var errorMsg = data.TryGetProperty("message", out var msgEl) ? msgEl.GetString() :
                               data.TryGetProperty("Message", out msgEl) ? msgEl.GetString() : "Giao dịch thất bại";
                ViewBag.Message = errorMsg;
            }
        }
        catch (Exception ex)
        {
            ViewBag.Status = "error";
            ViewBag.Message = ex.Message;
        }

        return View();
    }
}

// Helper classes for deserialization
public class SlotItem
{
    public int courtId { get; set; }
    public int timeSlotId { get; set; }
    public string playDate { get; set; } = "";
}

public class ProductItem
{
    public int productId { get; set; }
    public int quantity { get; set; }
}
