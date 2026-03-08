using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VouchersController : ControllerBase
    {
        private readonly BadmintonManagementContext _context;

        public VouchersController(BadmintonManagementContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetVouchers()
        {
            return Ok(await _context.Vouchers.OrderByDescending(v => v.Id).ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> CreateVoucher([FromBody] Voucher voucher)
        {
            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, data = voucher });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVoucher(int id, [FromBody] Voucher voucher)
        {
            if (id != voucher.Id) return BadRequest();
            _context.Entry(voucher).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVoucher(int id)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null) return NotFound();
            _context.Vouchers.Remove(voucher);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // API kiểm tra mã giảm giá (Dành cho máy POS / Booking gọi)
        [HttpGet("validate/{code}")]
        public async Task<IActionResult> ValidateVoucher(string code)
        {
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == code);
            if (voucher == null) return NotFound(new { isValid = false, message = "Mã không tồn tại" });
            if (voucher.ExpiryDate < DateOnly.FromDateTime(DateTime.Now)) return BadRequest(new { isValid = false, message = "Mã đã hết hạn" }); if (voucher.UsageLimit <= 0) return BadRequest(new { isValid = false, message = "Mã đã hết lượt sử dụng" });

            return Ok(new { isValid = true, discountAmount = voucher.DiscountAmount, message = "Áp dụng mã thành công!" });
        }
    }
}