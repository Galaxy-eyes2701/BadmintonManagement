using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    // Dữ liệu 1 món hàng trong giỏ
    public class CartItemDto
    {
        [Required]
        public int ProductId { get; set; }

        [Range(1, 1000, ErrorMessage = "Số lượng phải lớn hơn 0")]
        public int Quantity { get; set; }
    }

    // Dữ liệu toàn bộ giỏ hàng
    public class CreateOrderDto
    {
        public int? BookingId { get; set; } // Null nếu là khách vãng lai mua nước

        [Required]
        [MinLength(1, ErrorMessage = "Giỏ hàng không được trống")]
        public List<CartItemDto> Items { get; set; } = new List<CartItemDto>();
    }
}