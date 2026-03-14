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

        public TimeSlotController(ITimeSlotRepository repo)
            => _repo = repo;

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