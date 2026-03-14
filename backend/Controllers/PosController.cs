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
            // Lấy ngày hôm nay (bỏ phần giờ phút đi)
            var today = DateOnly.FromDateTime(DateTime.Now);

            // Tìm những đơn đặt sân ĐÃ XÁC NHẬN và CÓ LỊCH ĐÁ VÀO HÔM NAY
            var bookings = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Court)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .Where(b => b.Status == "confirmed")
                .Where(b => b.BookingDetails.Any(bd => bd.PlayDate == today)) // <-- Thêm dòng then chốt này
                .Select(b => new
                {
                    id = b.Id,
                    customerName = b.User != null ? b.User.FullName : "Khách vãng lai",
                    courtName = b.BookingDetails.FirstOrDefault().Court.Name,
                    time = b.BookingDetails.FirstOrDefault().TimeSlot != null
                           ? $"{b.BookingDetails.FirstOrDefault().TimeSlot.StartTime:hh\\:mm} - {b.BookingDetails.FirstOrDefault().TimeSlot.EndTime:hh\\:mm}"
                           : ""
                })
                .ToListAsync();

            return Ok(bookings);
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