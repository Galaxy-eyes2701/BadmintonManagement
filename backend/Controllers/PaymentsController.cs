using backend.DTOs;
using backend.Helpers;
using backend.Interface.Service;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly IConfiguration _configuration;
        private readonly BadmintonManagementContext _context;

        public PaymentsController(IPaymentService paymentService, IConfiguration configuration, BadmintonManagementContext context)
        {
            _paymentService = paymentService;
            _configuration = configuration;
            _context = context;
        }
        [HttpGet("recent-transactions")]
        public async Task<IActionResult> GetRecentTransactions([FromQuery] int limit = 5)
        {
            var transactions = await _paymentService.GetRecentTransactionsAsync(limit);
            return Ok(transactions);
        }
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
                    string vnp_Returnurl = _configuration["VnPay:ReturnUrl"] ?? "";
                    string vnp_Url = _configuration["VnPay:BaseUrl"] ?? "";
                    string vnp_TmnCode = _configuration["VnPay:TmnCode"] ?? "";
                    string vnp_HashSecret = _configuration["VnPay:HashSecret"] ?? "";

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

            string vnp_HashSecret = _configuration["VnPay:HashSecret"] ?? "";
            string vnp_SecureHash = Request.Query["vnp_SecureHash"].ToString() ?? "";

            bool checkSignature = vnpay.ValidateSignature(vnp_SecureHash, vnp_HashSecret);
            if (!checkSignature) return BadRequest(new { Success = false, Message = "Chữ ký bảo mật không hợp lệ!" });

            if (vnpay.GetResponseData("vnp_ResponseCode") == "00")
            {
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

                await _paymentService.ProcessPaymentAsync(paymentDto);
                return Ok(new { Success = true, Message = "Thanh toán VNPay thành công và đã cập nhật hệ thống!" });
            }
            return BadRequest(new { Success = false, Message = "Thanh toán bị hủy hoặc lỗi tại VNPay." });
        }

        [HttpGet("revenue-report")]
        public async Task<IActionResult> GetRevenueReport([FromQuery] int month, [FromQuery] int year)
        {
            var report = await _paymentService.GetRevenueReportAsync(month, year);
            return Ok(report);
        }

        // ============================================
        // DEPOSIT PAYMENT ENDPOINTS
        // ============================================

        /// <summary>
        /// Get booking payment summary (deposit, remaining, products)
        /// </summary>
        [HttpGet("booking-summary/{bookingId}")]
        public async Task<IActionResult> GetBookingPaymentSummary(int bookingId)
        {
            try
            {
                var summary = await _paymentService.GetBookingPaymentSummaryAsync(bookingId);
                return Ok(new { Success = true, Data = summary });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Create VNPay deposit payment URL (50% of court total)
        /// </summary>
        [HttpPost("deposit/create")]
        public async Task<IActionResult> CreateDepositPayment([FromBody] CreateDepositPaymentDto dto)
        {
            try
            {
                var booking = await _context.Bookings.FindAsync(dto.BookingId);
                if (booking == null)
                    return BadRequest(new { Success = false, Message = "Không tìm thấy booking." });

                // Calculate deposit amount (50% of court total)
                decimal courtTotal = booking.TotalPrice ?? 0;
                decimal depositAmount = Math.Ceiling(courtTotal / 2); // Round up

                if (depositAmount <= 0)
                    return BadRequest(new { Success = false, Message = "Số tiền đặt cọc không hợp lệ." });

                // Create VNPay URL
                string vnp_Returnurl = _configuration["VnPay:ReturnUrl"] ?? "";
                string vnp_Url = _configuration["VnPay:BaseUrl"] ?? "";
                string vnp_TmnCode = _configuration["VnPay:TmnCode"] ?? "";
                string vnp_HashSecret = _configuration["VnPay:HashSecret"] ?? "";

                VnPayLibrary vnpay = new VnPayLibrary();
                vnpay.AddRequestData("vnp_Version", "2.1.0");
                vnpay.AddRequestData("vnp_Command", "pay");
                vnpay.AddRequestData("vnp_TmnCode", vnp_TmnCode);
                vnpay.AddRequestData("vnp_Amount", (depositAmount * 100).ToString("0"));
                vnpay.AddRequestData("vnp_CreateDate", DateTime.Now.ToString("yyyyMMddHHmmss"));
                vnpay.AddRequestData("vnp_CurrCode", "VND");
                vnpay.AddRequestData("vnp_IpAddr", "127.0.0.1");
                vnpay.AddRequestData("vnp_Locale", "vn");
                vnpay.AddRequestData("vnp_OrderInfo", $"Dat coc 50% don dat san {dto.BookingId}");
                vnpay.AddRequestData("vnp_OrderType", "other");
                vnpay.AddRequestData("vnp_ReturnUrl", vnp_Returnurl);
                // Use DEP_ prefix to identify deposit payments
                vnpay.AddRequestData("vnp_TxnRef", $"DEP_{dto.BookingId}_{DateTime.Now.Ticks}");

                string paymentUrl = vnpay.CreateRequestUrl(vnp_Url, vnp_HashSecret);

                return Ok(new DepositPaymentResponseDto
                {
                    BookingId = dto.BookingId,
                    CourtTotal = courtTotal,
                    DepositAmount = depositAmount,
                    RemainingCourtAmount = courtTotal - depositAmount,
                    PaymentUrl = paymentUrl,
                    Message = "Chuyển hướng đến VNPay để thanh toán đặt cọc"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// VNPay return handler for deposit payment
        /// </summary>
        [HttpGet("deposit/vnpay-return")]
        public async Task<IActionResult> DepositPaymentReturn()
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

            string vnp_HashSecret = _configuration["VnPay:HashSecret"] ?? "";
            string vnp_SecureHash = Request.Query["vnp_SecureHash"].ToString() ?? "";

            bool checkSignature = vnpay.ValidateSignature(vnp_SecureHash, vnp_HashSecret);
            if (!checkSignature) return BadRequest(new { Success = false, Message = "Chữ ký bảo mật không hợp lệ!" });

            if (vnpay.GetResponseData("vnp_ResponseCode") == "00")
            {
                string txnRef = vnpay.GetResponseData("vnp_TxnRef");
                // Parse booking ID from DEP_BookingId_Ticks format
                var parts = txnRef.Split('_');
                if (parts.Length < 2 || parts[0] != "DEP")
                    return BadRequest(new { Success = false, Message = "Mã giao dịch không hợp lệ." });

                int bookingId = int.Parse(parts[1]);
                decimal amount = decimal.Parse(vnpay.GetResponseData("vnp_Amount")) / 100;
                string transactionNo = vnpay.GetResponseData("vnp_TransactionNo");

                // Create deposit payment with DEP_ prefix in transaction ID
                await _paymentService.CreateDepositPaymentAsync(bookingId, amount, $"DEP_{transactionNo}");

                return Ok(new { Success = true, Message = "Thanh toán đặt cọc thành công! Booking đã được xác nhận.", BookingId = bookingId, Amount = amount });
            }
            return BadRequest(new { Success = false, Message = "Thanh toán bị hủy hoặc lỗi tại VNPay." });
        }

        /// <summary>
        /// Pay remaining amount (court + optional products) via VNPay
        /// </summary>
        [HttpPost("remaining/create")]
        public async Task<IActionResult> CreateRemainingPayment([FromBody] PayRemainingDto dto)
        {
            try
            {
                var booking = await _context.Bookings
                    .Include(b => b.Orders)
                    .Include(b => b.Payments)
                    .FirstOrDefaultAsync(b => b.Id == dto.BookingId);

                if (booking == null)
                    return BadRequest(new { Success = false, Message = "Không tìm thấy booking." });

                // Calculate amounts
                decimal courtTotal = booking.TotalPrice ?? 0;
                decimal productTotal = booking.Orders?.Sum(o => o.TotalAmount) ?? 0;
                decimal totalPaid = booking.Payments?.Where(p => p.Status == "success").Sum(p => p.Amount) ?? 0;
                decimal remainingCourt = courtTotal - totalPaid;

                // Calculate total to pay based on product payment option
                decimal totalToPay = 0;
                if (dto.ProductPaymentOption.ToLower() == "online")
                {
                    // Pay remaining court + all products
                    totalToPay = Math.Max(0, remainingCourt) + productTotal;
                }
                else
                {
                    // Pay only remaining court (products will be paid onsite)
                    totalToPay = Math.Max(0, remainingCourt);
                }

                if (totalToPay <= 0)
                    return Ok(new RemainingPaymentResponseDto
                    {
                        BookingId = dto.BookingId,
                        RemainingCourtAmount = remainingCourt,
                        ProductTotal = productTotal,
                        TotalToPay = 0,
                        Message = "Không còn khoản cần thanh toán.",
                        Success = true
                    });

                // Create VNPay URL
                string vnp_Returnurl = _configuration["VnPay:ReturnUrl"] ?? "";
                string vnp_Url = _configuration["VnPay:BaseUrl"] ?? "";
                string vnp_TmnCode = _configuration["VnPay:TmnCode"] ?? "";
                string vnp_HashSecret = _configuration["VnPay:HashSecret"] ?? "";

                VnPayLibrary vnpay = new VnPayLibrary();
                vnpay.AddRequestData("vnp_Version", "2.1.0");
                vnpay.AddRequestData("vnp_Command", "pay");
                vnpay.AddRequestData("vnp_TmnCode", vnp_TmnCode);
                vnpay.AddRequestData("vnp_Amount", (totalToPay * 100).ToString("0"));
                vnpay.AddRequestData("vnp_CreateDate", DateTime.Now.ToString("yyyyMMddHHmmss"));
                vnpay.AddRequestData("vnp_CurrCode", "VND");
                vnpay.AddRequestData("vnp_IpAddr", "127.0.0.1");
                vnpay.AddRequestData("vnp_Locale", "vn");
                vnpay.AddRequestData("vnp_OrderInfo", $"Thanh toan con lai don dat san {dto.BookingId}");
                vnpay.AddRequestData("vnp_OrderType", "other");
                vnpay.AddRequestData("vnp_ReturnUrl", vnp_Returnurl);
                // Use REM_ or PROD_ prefix based on payment option
                string prefix = dto.ProductPaymentOption.ToLower() == "online" ? "PROD" : "REM";
                vnpay.AddRequestData("vnp_TxnRef", $"{prefix}_{dto.BookingId}_{DateTime.Now.Ticks}");

                string paymentUrl = vnpay.CreateRequestUrl(vnp_Url, vnp_HashSecret);

                return Ok(new RemainingPaymentResponseDto
                {
                    BookingId = dto.BookingId,
                    RemainingCourtAmount = remainingCourt,
                    ProductTotal = productTotal,
                    TotalToPay = totalToPay,
                    PaymentUrl = paymentUrl,
                    Message = "Chuyển hướng đến VNPay để thanh toán",
                    Success = true
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// VNPay return handler for remaining/product payment
        /// </summary>
        [HttpGet("remaining/vnpay-return")]
        public async Task<IActionResult> RemainingPaymentReturn()
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

            string vnp_HashSecret = _configuration["VnPay:HashSecret"] ?? "";
            string vnp_SecureHash = Request.Query["vnp_SecureHash"].ToString() ?? "";

            bool checkSignature = vnpay.ValidateSignature(vnp_SecureHash, vnp_HashSecret);
            if (!checkSignature) return BadRequest(new { Success = false, Message = "Chữ ký bảo mật không hợp lệ!" });

            if (vnpay.GetResponseData("vnp_ResponseCode") == "00")
            {
                string txnRef = vnpay.GetResponseData("vnp_TxnRef");
                // Parse booking ID from PREFIX_BookingId_Ticks format
                var parts = txnRef.Split('_');
                if (parts.Length < 2)
                    return BadRequest(new { Success = false, Message = "Mã giao dịch không hợp lệ." });

                string prefix = parts[0];
                int bookingId = int.Parse(parts[1]);
                decimal amount = decimal.Parse(vnpay.GetResponseData("vnp_Amount")) / 100;
                string transactionNo = vnpay.GetResponseData("vnp_TransactionNo");

                // Process payment based on prefix
                if (prefix == "PROD")
                {
                    // Product payment (remaining court + products)
                    await _paymentService.ProcessProductPaymentAsync(bookingId, amount, "VNPAY", $"PROD_{transactionNo}");
                }
                else
                {
                    // Remaining court payment only
                    await _paymentService.ProcessRemainingCourtPaymentAsync(bookingId, amount, "VNPAY", $"REM_{transactionNo}");
                }

                return Ok(new { Success = true, Message = "Thanh toán thành công!", BookingId = bookingId, Amount = amount });
            }
            return BadRequest(new { Success = false, Message = "Thanh toán bị hủy hoặc lỗi tại VNPay." });
        }
    }
}