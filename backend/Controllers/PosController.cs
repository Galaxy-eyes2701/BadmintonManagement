using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PosController : ControllerBase
    {
        private readonly IPosService _posService;

        public PosController(IPosService posService)
        {
            _posService = posService;
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