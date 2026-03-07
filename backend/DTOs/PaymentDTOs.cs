using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class CreatePaymentDto
    {
        [Required]
        public int BookingId { get; set; }

        [Required]
        [Range(1, double.MaxValue, ErrorMessage = "Số tiền thanh toán phải lớn hơn 0")]
        public decimal Amount { get; set; }

        [Required]
        public string PaymentMethod { get; set; } = "Cash"; // Cash, Momo, VNPay

        public string? TransactionId { get; set; } // Mã giao dịch Momo/VNPay (nếu có)
    }
}