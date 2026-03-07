namespace backend.DTOs
{
    public class VoucherResultDto
    {
        public bool IsValid { get; set; }
        public decimal DiscountAmount { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}