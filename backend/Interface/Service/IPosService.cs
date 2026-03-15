using backend.DTOs;
using backend.Models;

namespace backend.Interface.Service
{
    public interface IPosService
    {
        // Quản lý Sản phẩm (CRUD)
        Task<IEnumerable<Category>> GetCategoriesAsync();
        Task<IEnumerable<Product>> GetProductsAsync();
        Task<IEnumerable<object>> GetActiveBookingsAsync();
        // Nghiệp vụ Cốt lõi: Tạo Đơn hàng POS
        Task<Order> CreateOrderAsync(CreateOrderDto orderDto);
    }
}