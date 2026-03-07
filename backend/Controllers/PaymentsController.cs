using backend.DTOs;
using backend.Helpers;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly IConfiguration _configuration;

        public PaymentsController(IPaymentService paymentService, IConfiguration configuration)
        {
            _paymentService = paymentService;
            _configuration = configuration;
        }

        // 1. API Xử lý thanh toán (Tạo link VNPay hoặc trả tiền mặt COD)
        [HttpPost("process")]
        public async Task<IActionResult> ProcessPayment([FromBody] CreatePaymentDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                if (dto.PaymentMethod.ToUpper() == "COD")
                {
                    var payment = await _paymentService.ProcessPaymentAsync(dto);
                    return Ok(new { Success = true, Message = "Thanh toán COD thành công!", Data = payment });
                }
                else if (dto.PaymentMethod.ToUpper() == "VNPAY")
                {
                    string vnp_Returnurl = _configuration["VnPay:ReturnUrl"];
                    string vnp_Url = _configuration["VnPay:BaseUrl"];
                    string vnp_TmnCode = _configuration["VnPay:TmnCode"];
                    string vnp_HashSecret = _configuration["VnPay:HashSecret"];

                    VnPayLibrary vnpay = new VnPayLibrary();
                    vnpay.AddRequestData("vnp_Version", "2.1.0");
                    vnpay.AddRequestData("vnp_Command", "pay");
                    vnpay.AddRequestData("vnp_TmnCode", vnp_TmnCode);
                    vnpay.AddRequestData("vnp_Amount", (dto.Amount * 100).ToString("0"));
                    vnpay.AddRequestData("vnp_CreateDate", DateTime.Now.ToString("yyyyMMddHHmmss"));
                    vnpay.AddRequestData("vnp_CurrCode", "VND");
                    vnpay.AddRequestData("vnp_IpAddr", "127.0.0.1");
                    vnpay.AddRequestData("vnp_Locale", "vn");
                    vnpay.AddRequestData("vnp_OrderInfo", $"Thanh toan don dat san {dto.BookingId}");
                    vnpay.AddRequestData("vnp_OrderType", "other");
                    vnpay.AddRequestData("vnp_ReturnUrl", vnp_Returnurl);

                    // Nối BookingId vào mã giao dịch để lúc sau lấy ra cập nhật DB
                    vnpay.AddRequestData("vnp_TxnRef", $"{dto.BookingId}_{DateTime.Now.Ticks}");

                    string paymentUrl = vnpay.CreateRequestUrl(vnp_Url, vnp_HashSecret);

                    return Ok(new { Success = true, Message = "Chuyển hướng đến VNPay", PaymentUrl = paymentUrl });
                }

                return BadRequest(new { Success = false, Message = "Phương thức thanh toán không hợp lệ" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        // 2. API Hứng kết quả từ VNPay trả về (Frontend sẽ gọi API này)
        [HttpGet("vnpay-return")]
        public async Task<IActionResult> PaymentReturn()
        {
            var vnpayData = Request.Query;
            VnPayLibrary vnpay = new VnPayLibrary();

            foreach (var (key, value) in vnpayData)
            {
                if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_"))
                {
                    vnpay.AddResponseData(key, value.ToString());
                }
            }

            string vnp_HashSecret = _configuration["VnPay:HashSecret"];
            string vnp_SecureHash = Request.Query["vnp_SecureHash"];

            bool checkSignature = vnpay.ValidateSignature(vnp_SecureHash, vnp_HashSecret);
            if (!checkSignature)
                return BadRequest(new { Success = false, Message = "Chữ ký bảo mật không hợp lệ!" });

            if (vnpay.GetResponseData("vnp_ResponseCode") == "00")
            {
                // Bóc tách BookingId từ vnp_TxnRef
                string txnRef = vnpay.GetResponseData("vnp_TxnRef");
                int bookingId = int.Parse(txnRef.Split('_')[0]);
                decimal amount = decimal.Parse(vnpay.GetResponseData("vnp_Amount")) / 100;
                string transactionNo = vnpay.GetResponseData("vnp_TransactionNo");

                var paymentDto = new CreatePaymentDto
                {
                    BookingId = bookingId,
                    Amount = amount,
                    PaymentMethod = "VNPAY",
                    TransactionId = transactionNo
                };

                // Lưu vào Database
                await _paymentService.ProcessPaymentAsync(paymentDto);

                return Ok(new { Success = true, Message = "Thanh toán VNPay thành công và đã cập nhật hệ thống!" });
            }

            return BadRequest(new { Success = false, Message = "Thanh toán bị hủy hoặc lỗi tại VNPay." });
        }

        // 3. API Thống kê doanh thu cho Biểu đồ
        [HttpGet("revenue-report")]
        public async Task<IActionResult> GetRevenueReport([FromQuery] int month, [FromQuery] int year)
        {
            var report = await _paymentService.GetRevenueReportAsync(month, year);
            return Ok(report);
        }
    }
}