using backend.Dtos.Admin;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/admin/vouchers")]
    public class AdminVoucherController : ControllerBase
    {
        private readonly IAdminVoucherRepository _repo;

        public AdminVoucherController(IAdminVoucherRepository repo)
            => _repo = repo;

        // ------------------------------------------------------------------ //
        // GET /api/admin/vouchers
        // GET /api/admin/vouchers?status=active|expired
        // ------------------------------------------------------------------ //
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var vouchers = await _repo.GetAllAsync();
            var today    = DateOnly.FromDateTime(DateTime.Today);

            // Lọc theo trạng thái nếu có
            if (!string.IsNullOrEmpty(status))
            {
                vouchers = status.ToLower() switch
                {
                    "active"  => vouchers.Where(v => v.ExpiryDate >= today),
                    "expired" => vouchers.Where(v => v.ExpiryDate <  today),
                    _         => vouchers
                };
            }

            return Ok(vouchers.Select(v => ToDto(v, today)));
        }

        // ------------------------------------------------------------------ //
        // GET /api/admin/vouchers/{id}
        // ------------------------------------------------------------------ //
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var voucher = await _repo.GetByIdAsync(id);
            if (voucher == null) return NotFound();

            var today = DateOnly.FromDateTime(DateTime.Today);
            return Ok(ToDto(voucher, today));
        }

        // ------------------------------------------------------------------ //
        // POST /api/admin/vouchers
        // ------------------------------------------------------------------ //
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] VoucherUpsertDto dto)
        {
            // Chuẩn hoá code: uppercase, bỏ khoảng trắng
            var code = dto.Code.Trim().ToUpper();

            if (await _repo.CodeExistsAsync(code))
                return Conflict(new { message = $"Mã voucher '{code}' đã tồn tại." });

            var voucher = new Voucher
            {
                Code           = code,
                DiscountAmount = dto.DiscountAmount,
                UsageLimit     = dto.UsageLimit,
                ExpiryDate     = dto.ExpiryDate
            };

            var created = await _repo.CreateAsync(voucher);
            var today   = DateOnly.FromDateTime(DateTime.Today);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, ToDto(created, today));
        }

        // ------------------------------------------------------------------ //
        // PUT /api/admin/vouchers/{id}
        // ------------------------------------------------------------------ //
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] VoucherUpsertDto dto)
        {
            var voucher = await _repo.GetByIdAsync(id);
            if (voucher == null) return NotFound();

            var code = dto.Code.Trim().ToUpper();

            // Kiểm tra trùng code với voucher khác
            var duplicate = await _repo.GetByCodeAsync(code);
            if (duplicate != null && duplicate.Id != id)
                return Conflict(new { message = $"Mã voucher '{code}' đã được dùng bởi voucher khác." });

            voucher.Code           = code;
            voucher.DiscountAmount = dto.DiscountAmount;
            voucher.UsageLimit     = dto.UsageLimit;
            voucher.ExpiryDate     = dto.ExpiryDate;

            await _repo.UpdateAsync(voucher);

            var today = DateOnly.FromDateTime(DateTime.Today);
            return Ok(ToDto(voucher, today));
        }

        // ------------------------------------------------------------------ //
        // DELETE /api/admin/vouchers/{id}
        // ------------------------------------------------------------------ //
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var voucher = await _repo.GetByIdAsync(id);
            if (voucher == null) return NotFound();

            await _repo.DeleteAsync(id);
            return NoContent();
        }

        // ------------------------------------------------------------------ //
        // GET /api/admin/vouchers/validate?code=XYZ
        // Dùng cho phần kiểm tra voucher khi khách đặt sân
        // ------------------------------------------------------------------ //
        [HttpGet("validate")]
        public async Task<IActionResult> Validate([FromQuery] string code)
        {
            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Vui lòng nhập mã voucher." });

            var voucher = await _repo.GetByCodeAsync(code.Trim());
            if (voucher == null)
                return NotFound(new { message = "Mã voucher không tồn tại." });

            var today = DateOnly.FromDateTime(DateTime.Today);
            if (voucher.ExpiryDate < today)
                return BadRequest(new { message = "Mã voucher đã hết hạn." });

            return Ok(new
            {
                voucher.Id,
                voucher.Code,
                voucher.DiscountAmount,
                voucher.UsageLimit,
                ExpiryDate = voucher.ExpiryDate.ToString("yyyy-MM-dd"),
                IsValid    = true
            });
        }

        // ------------------------------------------------------------------ //
        // Helper mapper
        // ------------------------------------------------------------------ //
        private static VoucherResponseDto ToDto(Voucher v, DateOnly today) => new()
        {
            Id             = v.Id,
            Code           = v.Code,
            DiscountAmount = v.DiscountAmount,
            UsageLimit     = v.UsageLimit,
            ExpiryDate     = v.ExpiryDate.ToString("yyyy-MM-dd"),
            IsExpired      = v.ExpiryDate < today
        };
    }
}