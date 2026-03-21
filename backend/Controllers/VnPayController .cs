using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/vnpay")]
public class VnPayController : ControllerBase
{
    private readonly VnPayService _vnpay;
    private readonly IConfiguration _config;

    public VnPayController(VnPayService vnpay, IConfiguration config)
    {
        _vnpay = vnpay;
        _config = config;
    }

    // POST api/vnpay/create-payment
    [HttpPost("create-payment")]
    public IActionResult CreatePayment([FromBody] VnPayRequest model)
    {
        if (model.Amount <= 0)
            return BadRequest("So tien khong hop le");

        // ⚠️ OrderInfo KHÔNG được có ký tự đặc biệt như #, /, &
        // Chỉ dùng chữ cái, số, dấu cách
        var orderId = model.BookingId.HasValue
            ? $"San {model.BookingId} {DateTime.Now:ddMMyyyy HHmmss}"
            : $"Vang lai {DateTime.Now:ddMMyyyy HHmmss}";

        model.OrderInfo = orderId;

        var paymentUrl = _vnpay.CreatePaymentUrl(HttpContext, model);
        return Ok(new { paymentUrl });
    }

    // GET api/vnpay/payment-return  ← VNPay redirect về đây
    [HttpGet("payment-return")]
    public IActionResult PaymentReturn()
    {
        var query = HttpContext.Request.Query;
        var hashSecret = _config["VnPay:HashSecret"]!;
        var isValid = _vnpay.ValidateSignature(query, hashSecret);

        var responseCode = query["vnp_ResponseCode"].ToString();
        var txnRef = query["vnp_TxnRef"].ToString();
        var amountRaw = query["vnp_Amount"].ToString();
        var orderInfo = query["vnp_OrderInfo"].ToString();

        double amount = double.TryParse(amountRaw, out var a) ? a / 100 : 0;
        bool success = isValid && responseCode == "00";

        // Parse bookingId từ orderInfo ("San 5 21032026 122243")
        int? bookingId = null;
        var match = System.Text.RegularExpressions.Regex.Match(orderInfo, @"San (\d+)");
        if (match.Success) bookingId = int.Parse(match.Groups[1].Value);

        var mvcBase = _config["MvcBaseUrl"] ?? "http://localhost:5075";
        var qs = $"success={success}&amount={amount}&txnRef={txnRef}" +
                 $"&bookingId={bookingId}&code={responseCode}";

        return Redirect($"{mvcBase}/Staff/PaymentResult?{qs}");
    }
}