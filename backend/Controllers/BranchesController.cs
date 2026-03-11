using backend.Dtos;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BranchesController : ControllerBase
    {
        private readonly IBranchRepository _branchRepo;

        public BranchesController(IBranchRepository branchRepo)
        {
            _branchRepo = branchRepo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var branches = await _branchRepo.GetAllAsync();
            return Ok(branches);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var branch = await _branchRepo.GetByIdAsync(id);
            if (branch == null) return NotFound("Không tìm thấy chi nhánh.");
            return Ok(branch);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BranchDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var branch = new Branch
            {
                Name = dto.Name,
                Address = dto.Address,
                Hotline = dto.Hotline
            };

            var createdBranch = await _branchRepo.CreateAsync(branch);
            return CreatedAtAction(nameof(GetById), new { id = createdBranch.Id }, createdBranch);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] BranchDto dto)
        {
            var existingBranch = await _branchRepo.GetByIdAsync(id);
            if (existingBranch == null) return NotFound("Không tìm thấy chi nhánh.");

            existingBranch.Name = dto.Name;
            existingBranch.Address = dto.Address;
            existingBranch.Hotline = dto.Hotline;

            await _branchRepo.UpdateAsync(existingBranch);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existingBranch = await _branchRepo.GetByIdAsync(id);
            if (existingBranch == null) return NotFound("Không tìm thấy chi nhánh.");

            await _branchRepo.DeleteAsync(id);
            return NoContent();
        }
    }
}