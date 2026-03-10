using backend.DTOs;
using backend.Models;

namespace backend.Services
{
    public interface IPosService
    {
        // Quản lý Sản phẩm (CRUD)
        Task<IEnumerable<Category>> GetCategoriesAsync();
        Task<IEnumerable<Product>> GetProductsAsync();

        // Nghiệp vụ Cốt lõi: Tạo Đơn hàng POS
        Task<Order> CreateOrderAsync(CreateOrderDto orderDto);
    }
}