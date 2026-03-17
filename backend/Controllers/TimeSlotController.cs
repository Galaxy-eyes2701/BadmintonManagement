using backend.Interface.Repository;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/timeslots")]
    public class TimeSlotController : ControllerBase
    {
        private readonly ITimeSlotRepository _repo;
        private readonly BadmintonManagementContext _context;

        public TimeSlotController(ITimeSlotRepository repo, BadmintonManagementContext context)
        {
            _repo = repo;
            _context = context;
        }

        // POST /api/timeslots/seed-standard
        // Tạo các khung giờ chuẩn: sáng 5h-12h, chiều 13h-17h, tối 17h-22h
        [HttpPost("seed-standard")]
        public async Task<IActionResult> SeedStandardTimeSlots()
        {
            var standardSlots = new List<(TimeOnly Start, TimeOnly End)>
            {
                // Sáng: 5h - 12h (5, 6, 7, 8, 9, 10, 11)
                (new TimeOnly(5, 0), new TimeOnly(6, 0)),
                (new TimeOnly(6, 0), new TimeOnly(7, 0)),
                (new TimeOnly(7, 0), new TimeOnly(8, 0)),
                (new TimeOnly(8, 0), new TimeOnly(9, 0)),
                (new TimeOnly(9, 0), new TimeOnly(10, 0)),
                (new TimeOnly(10, 0), new TimeOnly(11, 0)),
                (new TimeOnly(11, 0), new TimeOnly(12, 0)),
                // Chiều: 13h - 17h (13, 14, 15, 16)
                (new TimeOnly(13, 0), new TimeOnly(14, 0)),
                (new TimeOnly(14, 0), new TimeOnly(15, 0)),
                (new TimeOnly(15, 0), new TimeOnly(16, 0)),
                (new TimeOnly(16, 0), new TimeOnly(17, 0)),
                // Tối: 17h - 22h (17, 18, 19, 20, 21)
                (new TimeOnly(17, 0), new TimeOnly(18, 0)),
                (new TimeOnly(18, 0), new TimeOnly(19, 0)),
                (new TimeOnly(19, 0), new TimeOnly(20, 0)),
                (new TimeOnly(20, 0), new TimeOnly(21, 0)),
                (new TimeOnly(21, 0), new TimeOnly(22, 0)),
            };

            var existingSlots = await _repo.GetAllAsync();
            var createdCount = 0;
            var skippedCount = 0;

            foreach (var (start, end) in standardSlots)
            {
                // Kiểm tra xem khung giờ đã tồn tại chưa
                var exists = existingSlots.Any(s => s.StartTime == start && s.EndTime == end);
                if (!exists)
                {
                    await _repo.CreateAsync(new TimeSlot { StartTime = start, EndTime = end });
                    createdCount++;
                }
                else
                {
                    skippedCount++;
                }
            }

            return Ok(new
            {
                success = true,
                message = $"Đã tạo {createdCount} khung giờ mới, bỏ qua {skippedCount} khung giờ đã tồn tại.",
                created = createdCount,
                skipped = skippedCount
            });
        }

        // GET /api/timeslots
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var slots = await _repo.GetAllAsync();
            var result = slots.Select(s => new
            {
                s.Id,
                StartTime = s.StartTime.ToString(@"HH\:mm\:ss"),
                EndTime   = s.EndTime.ToString(@"HH\:mm\:ss"),
                Label     = $"{s.StartTime:HH\\:mm} - {s.EndTime:HH\\:mm}"
            });
            return Ok(result);
        }

        // GET /api/timeslots/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var slot = await _repo.GetByIdAsync(id);
            if (slot == null) return NotFound();
            return Ok(new
            {
                slot.Id,
                StartTime = slot.StartTime.ToString(@"HH\:mm\:ss"),
                EndTime   = slot.EndTime.ToString(@"HH\:mm\:ss"),
                Label     = $"{slot.StartTime:HH\\:mm} - {slot.EndTime:HH\\:mm}"
            });
        }

        // POST /api/timeslots
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TimeSlotDto dto)
        {
            if (!TimeOnly.TryParse(dto.StartTime, out var start) ||
                !TimeOnly.TryParse(dto.EndTime, out var end))
                return BadRequest(new { message = "Định dạng thời gian không hợp lệ (HH:mm)." });

            if (end <= start)
                return BadRequest(new { message = "EndTime phải sau StartTime." });

            var slot = new TimeSlot { StartTime = start, EndTime = end };
            var created = await _repo.CreateAsync(slot);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, new
            {
                created.Id,
                StartTime = created.StartTime.ToString(@"HH\:mm\:ss"),
                EndTime   = created.EndTime.ToString(@"HH\:mm\:ss"),
                Label     = $"{created.StartTime:HH\\:mm} - {created.EndTime:HH\\:mm}"
            });
        }

        // PUT /api/timeslots/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] TimeSlotDto dto)
        {
            var slot = await _repo.GetByIdAsync(id);
            if (slot == null) return NotFound();

            if (!TimeOnly.TryParse(dto.StartTime, out var start) ||
                !TimeOnly.TryParse(dto.EndTime, out var end))
                return BadRequest(new { message = "Định dạng thời gian không hợp lệ (HH:mm)." });

            if (end <= start)
                return BadRequest(new { message = "EndTime phải sau StartTime." });

            slot.StartTime = start;
            slot.EndTime   = end;
            await _repo.UpdateAsync(slot);
            return NoContent();
        }

        // DELETE /api/timeslots/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var slot = await _repo.GetByIdAsync(id);
            if (slot == null) return NotFound();

            await _repo.DeleteAsync(id);
            return NoContent();
        }
    }

    // DTO nằm cùng file cho gọn
    public class TimeSlotDto
    {
        public string StartTime { get; set; } = null!; // "07:00"
        public string EndTime   { get; set; } = null!; // "08:00"
    }
}