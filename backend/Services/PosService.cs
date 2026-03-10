using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class PosService : IPosService
    {
        private readonly BadmintonManagementContext _context;

        public PosService(BadmintonManagementContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Category>> GetCategoriesAsync()
        {
            return await _context.Categories.ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetProductsAsync()
        {
            return await _context.Products.Include(p => p.Category).ToListAsync();
        }

        public async Task<Order> CreateOrderAsync(CreateOrderDto orderDto)
        {
            // BẮT ĐẦU TRANSACTION: Đảm bảo toàn vẹn dữ liệu
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var newOrder = new Order
                {
                    BookingId = orderDto.BookingId,
                    CreatedAt = DateTime.Now,
                    TotalAmount = 0 // Sẽ tính toán ở dưới
                };

                _context.Orders.Add(newOrder);
                await _context.SaveChangesAsync(); // Lưu tạm để lấy OrderId

                decimal totalAmount = 0;

                foreach (var item in orderDto.Items)
                {
                    // 1. Tìm sản phẩm
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null)
                        throw new Exception($"Không tìm thấy sản phẩm có ID {item.ProductId}");

                    // 2. Trừ tồn kho
                    if (product.StockQuantity < item.Quantity)
                        throw new Exception($"Sản phẩm '{product.Name}' không đủ tồn kho (Còn: {product.StockQuantity})");

                    product.StockQuantity -= item.Quantity;

                    // 3. Snapshot Giá (Chốt giá ngay lúc mua)
                    var orderDetail = new OrderDetail
                    {
                        OrderId = newOrder.Id,
                        ProductId = product.Id,
                        Quantity = item.Quantity,
                        UnitPriceSnapshot = product.UnitPrice // SNAPSHOT GIÁ
                    };

                    _context.OrderDetails.Add(orderDetail);
                    totalAmount += (product.UnitPrice * item.Quantity);
                }

                // Cập nhật lại tổng tiền cho Order
                newOrder.TotalAmount = totalAmount;
                _context.Orders.Update(newOrder);

                // Lưu tất cả thay đổi (OrderDetails + Cập nhật tồn kho)
                await _context.SaveChangesAsync();

                // COMMIT TRANSACTION: Thành công thì mới lưu chính thức vào DB
                await transaction.CommitAsync();

                return newOrder;
            }
            catch (Exception ex)
            {
                // ROLLBACK: Nếu có lỗi (vd hết tồn kho), quay ngược lại như chưa từng có cuộc chia ly
                await transaction.RollbackAsync();
                throw new Exception($"Lỗi khi tạo hóa đơn POS: {ex.Message}");
            }
        }
    }
}