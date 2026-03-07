using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VouchersController : ControllerBase
    {
        private readonly IVoucherService _voucherService;

        public VouchersController(IVoucherService voucherService)
        {
            _voucherService = voucherService;
        }

        [HttpGet("validate/{code}")]
        public async Task<IActionResult> ValidateVoucher(string code)
        {
            var result = await _voucherService.ValidateVoucherAsync(code);

            if (!result.IsValid)
                return BadRequest(result); // Trả về lỗi 400 kèm câu thông báo để UI hiện màu đỏ

            return Ok(result); // Trả về 200 OK kèm số tiền được giảm để UI hiện màu xanh
        }
    }
}