using backend.Dtos.Admin;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/admin/price-configs")]
    // [Authorize(Roles = "Admin")]   // bật khi đã có JWT
    public class PriceConfigController : ControllerBase
    {
        private readonly IPriceConfigRepository _repo;

        public PriceConfigController(IPriceConfigRepository repo)
            => _repo = repo;

        // ------------------------------------------------------------------ //
        // GET /api/admin/price-configs
        // GET /api/admin/price-configs?courtTypeId=1
        // ------------------------------------------------------------------ //
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? courtTypeId)
        {
            var list = courtTypeId.HasValue
                ? await _repo.GetByCourtTypeAsync(courtTypeId.Value)
                : await _repo.GetAllAsync();

            var result = list.Select(MapToDto);
            return Ok(result);
        }

        // ------------------------------------------------------------------ //
        // GET /api/admin/price-configs/{id}
        // ------------------------------------------------------------------ //
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var config = await _repo.GetByIdAsync(id);
            return config == null ? NotFound() : Ok(MapToDto(config));
        }

        // ------------------------------------------------------------------ //
        // POST /api/admin/price-configs
        // ------------------------------------------------------------------ //
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PriceConfigUpsertDto dto)
        {
            // Kiểm tra trùng khoá duy nhất
            var duplicate = await _repo.GetByUniqueKeyAsync(
                dto.CourtTypeId, dto.TimeSlotId, dto.DayOfWeek);

            if (duplicate != null)
                return Conflict(new { message = "Cấu hình giá cho bộ (LoạiSân, KhungGiờ, ThứTrong tuần) này đã tồn tại." });

            if (!IsValidDayOfWeek(dto.DayOfWeek))
                return BadRequest(new { message = "DayOfWeek phải trong khoảng 0–6." });

            var config = new PriceConfig
            {
                CourtTypeId = dto.CourtTypeId,
                TimeSlotId  = dto.TimeSlotId,
                DayOfWeek   = dto.DayOfWeek,
                Price       = dto.Price
            };

            var created = await _repo.CreateAsync(config);
            var response = await _repo.GetByIdAsync(created.Id);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, MapToDto(response!));
        }

        // ------------------------------------------------------------------ //
        // PUT /api/admin/price-configs/{id}
        // ------------------------------------------------------------------ //
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] PriceConfigUpsertDto dto)
        {
            var config = await _repo.GetByIdAsync(id);
            if (config == null) return NotFound();

            if (!IsValidDayOfWeek(dto.DayOfWeek))
                return BadRequest(new { message = "DayOfWeek phải trong khoảng 0–6." });

            // Kiểm tra xem bộ khoá mới có trùng với bản ghi khác không
            var duplicate = await _repo.GetByUniqueKeyAsync(
                dto.CourtTypeId, dto.TimeSlotId, dto.DayOfWeek);

            if (duplicate != null && duplicate.Id != id)
                return Conflict(new { message = "Bộ (LoạiSân, KhungGiờ, ThứTrong tuần) đã tồn tại ở bản ghi khác." });

            config.CourtTypeId = dto.CourtTypeId;
            config.TimeSlotId  = dto.TimeSlotId;
            config.DayOfWeek   = dto.DayOfWeek;
            config.Price       = dto.Price;

            await _repo.UpdateAsync(config);
            return NoContent();
        }

        // ------------------------------------------------------------------ //
        // DELETE /api/admin/price-configs/{id}
        // ------------------------------------------------------------------ //
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var config = await _repo.GetByIdAsync(id);
            if (config == null) return NotFound();

            await _repo.DeleteAsync(id);
            return NoContent();
        }

        // ------------------------------------------------------------------ //
        // POST /api/admin/price-configs/bulk
        // Upsert hàng loạt — dùng khi lưu toàn bộ bảng giá từ UI
        // ------------------------------------------------------------------ //
        [HttpPost("bulk")]
        public async Task<IActionResult> BulkUpsert([FromBody] BulkPriceConfigDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "Danh sách không được rỗng." });

            var invalid = dto.Items.Where(i => !IsValidDayOfWeek(i.DayOfWeek)).ToList();
            if (invalid.Any())
                return BadRequest(new { message = "Có item với DayOfWeek không hợp lệ (phải 0–6)." });

            var configs = dto.Items.Select(i => new PriceConfig
            {
                CourtTypeId = i.CourtTypeId,
                TimeSlotId  = i.TimeSlotId,
                DayOfWeek   = i.DayOfWeek,
                Price       = i.Price
            });

            await _repo.BulkUpsertAsync(configs);
            return Ok(new { message = $"Đã upsert {dto.Items.Count} cấu hình giá thành công." });
        }

        // ------------------------------------------------------------------ //
        // Helper
        // ------------------------------------------------------------------ //
        private static bool IsValidDayOfWeek(int d) => d is >= 0 and <= 6;

        private static string GetDayLabel(int d) => d switch
        {
            0 => "Chủ nhật",
            1 => "Thứ 2",
            2 => "Thứ 3",
            3 => "Thứ 4",
            4 => "Thứ 5",
            5 => "Thứ 6",
            6 => "Thứ 7",
            _ => d.ToString()
        };

        private static PriceConfigResponseDto MapToDto(PriceConfig p) => new()
        {
            Id            = p.Id,
            CourtTypeId   = p.CourtTypeId,
            CourtTypeName = p.CourtType?.Name ?? string.Empty,
            TimeSlotId    = p.TimeSlotId,
            TimeSlotLabel = p.TimeSlot != null
                ? $"{p.TimeSlot.StartTime:HH\\:mm} - {p.TimeSlot.EndTime:HH\\:mm}"
                : string.Empty,
            DayOfWeek     = p.DayOfWeek,
            DayLabel      = GetDayLabel(p.DayOfWeek),
            Price         = p.Price
        };
    }
}