using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly BadmintonManagementContext _context;

        public ProductsController(BadmintonManagementContext context)
        {
            _context = context;
        }

        // 1. Lấy danh sách (Có phân loại)
        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _context.Products.Include(p => p.Category).ToListAsync();
            return Ok(products);
        }

        // 2. Thêm mới
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] Product product)
        {
            _context.Products.Add(product);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Thêm sản phẩm thành công!", data = product });
        }

        // 3. Cập nhật
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product product)
        {
            if (id != product.Id) return BadRequest();
            _context.Entry(product).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Cập nhật thành công!" });
        }

        // 4. Xóa
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();
            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Đã xóa sản phẩm!" });
        }

        // 5. Lấy danh mục (Để làm dropdown chọn Đồ uống/Dụng cụ)
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            return Ok(await _context.Categories.ToListAsync());
        }
    }
}