namespace backend.DTOs.Staff
{
    public class CheckoutDto
    {
        public string PaymentMethod { get; set; } = "CASH";

        // Phải có dòng này để Lễ tân nhập mã giảm giá
        public string? VoucherCode { get; set; }
    }
}