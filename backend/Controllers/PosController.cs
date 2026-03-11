using backend.DTOs;
using backend.Models; // THÊM DÒNG NÀY ĐỂ NHẬN DIỆN MODEL
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // THÊM DÒNG NÀY ĐỂ DÙNG ĐƯỢC .Include() VÀ .FirstOrDefaultAsync()

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PosController : ControllerBase
    {
        private readonly IPosService _posService;
        private readonly BadmintonManagementContext _context; // KHAI BÁO THÊM _context

        // BƠM _context VÀO CONSTRUCTOR
        public PosController(IPosService posService, BadmintonManagementContext context)
        {
            _posService = posService;
            _context = context;
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _posService.GetCategoriesAsync();
            return Ok(categories);
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _posService.GetProductsAsync();
            return Ok(products);
        }

        [HttpGet("active-bookings")]
        public async Task<IActionResult> GetActiveBookings()
        {
            return Ok(await _posService.GetActiveBookingsAsync());
        }

        [HttpGet("booking-bill/{bookingId}")]
        public async Task<IActionResult> GetFinalBookingBill(int bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Court)
                .Include(b => b.Orders) // Lấy danh sách nợ tiền nước POS
                .Include(b => b.Payments) // Lấy danh sách tiền đã thanh toán (Tiền cọc)
                .FirstOrDefaultAsync(b => b.Id == bookingId);

            if (booking == null) return NotFound("Không tìm thấy thông tin đặt sân");

            // 1. Tiền thuê sân (Ví dụ: 100k)
            decimal courtTotal = booking.TotalPrice ?? 0;

            // 2. Tiền nước uống/đồ dùng POS nợ thêm (Ví dụ: 30k)
            decimal posTotal = booking.Orders.Sum(o => o.TotalAmount);

            // 3. Tổng tiền khách đã trả (Tiền cọc 50% hoặc mã giảm giá) (Ví dụ: 50k)
            decimal alreadyPaid = booking.Payments
                .Where(p => p.Status == "success")
                .Sum(p => p.Amount);

            // 4. SỐ TIỀN CÒN PHẢI THU (100k + 30k - 50k = 80k)
            decimal remainingAmount = (courtTotal + posTotal) - alreadyPaid;

            return Ok(new
            {
                bookingId = booking.Id,
                customerName = booking.User.FullName,
                courtTotal = courtTotal,
                posTotal = posTotal,
                alreadyPaid = alreadyPaid,
                remainingAmount = remainingAmount > 0 ? remainingAmount : 0,
                status = remainingAmount <= 0 ? "Đã thanh toán đủ" : "Còn nợ"
            });
        }

        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto orderDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var order = await _posService.CreateOrderAsync(orderDto);
                return Ok(new
                {
                    Success = true,
                    Message = "Tạo hóa đơn thành công!",
                    OrderId = order.Id,
                    TotalAmount = order.TotalAmount
                });
            }
            catch (Exception ex)
            {
                // Trả về lỗi nếu hết tồn kho hoặc lỗi logic
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }
    }
}