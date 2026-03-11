using backend.Dtos;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CourtTypesController : ControllerBase
    {
        private readonly ICourtTypeRepository _courtTypeRepo;

        public CourtTypesController(ICourtTypeRepository courtTypeRepo)
        {
            _courtTypeRepo = courtTypeRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var courtTypes = await _courtTypeRepo.GetAllAsync();
            return Ok(courtTypes);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var courtType = await _courtTypeRepo.GetByIdAsync(id);
            if (courtType == null) return NotFound("Không tìm thấy loại sân.");
            return Ok(courtType);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CourtTypeDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var courtType = new CourtType
            {
                Name = dto.Name,
                Description = dto.Description
            };

            var createdType = await _courtTypeRepo.CreateAsync(courtType);
            return CreatedAtAction(nameof(GetById), new { id = createdType.Id }, createdType);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CourtTypeDto dto)
        {
            var existingType = await _courtTypeRepo.GetByIdAsync(id);
            if (existingType == null) return NotFound("Không tìm thấy loại sân.");

            existingType.Name = dto.Name;
            existingType.Description = dto.Description;

            await _courtTypeRepo.UpdateAsync(existingType);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existingType = await _courtTypeRepo.GetByIdAsync(id);
            if (existingType == null) return NotFound("Không tìm thấy loại sân.");

            await _courtTypeRepo.DeleteAsync(id);
            return NoContent();
        }
    }
}