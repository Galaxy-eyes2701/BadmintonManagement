using backend.Dtos;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CourtsController : ControllerBase
    {
        private readonly ICourtRepository _courtRepo;

        public CourtsController(ICourtRepository courtRepo)
        {
            _courtRepo = courtRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var courts = await _courtRepo.GetAllAsync();
            return Ok(courts);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var court = await _courtRepo.GetByIdAsync(id);
            if (court == null) return NotFound("Không tìm thấy sân.");
            return Ok(court);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CourtDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var court = new Court
            {
                BranchId = dto.BranchId,
                CourtTypeId = dto.CourtTypeId,
                Name = dto.Name,
                Status = dto.Status // Ví dụ: "active" hoặc "maintenance"
            };

            var createdCourt = await _courtRepo.CreateAsync(court);
            return CreatedAtAction(nameof(GetById), new { id = createdCourt.Id }, createdCourt);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CourtDto dto)
        {
            var existingCourt = await _courtRepo.GetByIdAsync(id);
            if (existingCourt == null) return NotFound("Không tìm thấy sân.");

            existingCourt.BranchId = dto.BranchId;
            existingCourt.CourtTypeId = dto.CourtTypeId;
            existingCourt.Name = dto.Name;
            existingCourt.Status = dto.Status;

            await _courtRepo.UpdateAsync(existingCourt);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existingCourt = await _courtRepo.GetByIdAsync(id);
            if (existingCourt == null) return NotFound("Không tìm thấy sân.");

            await _courtRepo.DeleteAsync(id);
            return NoContent();
        }
    }
}