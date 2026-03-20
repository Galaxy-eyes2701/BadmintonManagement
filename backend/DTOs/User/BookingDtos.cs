namespace backend.DTOs
{
    // ── Available Courts ────────────────────────────────────────────────────
    public class AvailableCourtDto
    {
        public int CourtId { get; set; }
        public string CourtName { get; set; } = "";
        public string CourtType { get; set; } = "";
        public int BranchId { get; set; }
        public string BranchName { get; set; } = "";
        public string BranchAddress { get; set; } = "";
        public List<AvailableSlotDto> AvailableSlots { get; set; } = new();
    }

    public class AvailableSlotDto
    {
        public int TimeSlotId { get; set; }
        public string StartTime { get; set; } = "";
        public string EndTime { get; set; } = "";
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; }
    }

    // ── Create Booking ───────────────────────────────────────────────────────
    public class CreateBookingDto
    {
        public List<BookingSlotDto> Slots { get; set; } = new();
        public string? VoucherCode { get; set; }
        public string PaymentMethod { get; set; } = "cash";
    }

    public class BookingSlotDto
    {
        public int CourtId { get; set; }
        public int TimeSlotId { get; set; }
        public DateTime PlayDate { get; set; }
    }

    // ── Booking Response ─────────────────────────────────────────────────────
    public class BookingResponseDto
    {
        public int BookingId { get; set; }
        public decimal SubTotal { get; set; }
        public decimal Discount { get; set; }
        public decimal TotalPrice { get; set; }
        public string Status { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public string? VoucherApplied { get; set; }
        public List<BookingDetailItemDto> Details { get; set; } = new();
        public PaymentInfoDto? Payment { get; set; }
    }

    public class BookingDetailItemDto
    {
        public int Id { get; set; }
        public string CourtName { get; set; } = "";
        public string BranchName { get; set; } = "";
        public string CourtType { get; set; } = "";
        public string TimeSlot { get; set; } = "";
        public string PlayDate { get; set; } = "";
        public decimal Price { get; set; }
    }

    public class PaymentInfoDto
    {
        public int PaymentId { get; set; }
        public string Method { get; set; } = "";
        public string Status { get; set; } = "";
        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── Booking History ──────────────────────────────────────────────────────
    public class BookingHistoryDto
    {
        public int BookingId { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal TotalPrice { get; set; }
        public string Status { get; set; } = "";
        public string PaymentStatus { get; set; } = "";
        public string PaymentMethod { get; set; } = "";
        public int SlotCount { get; set; }
        public string FirstCourtName { get; set; } = "";
        public string FirstBranchName { get; set; } = "";
        public string FirstPlayDate { get; set; } = "";
    }

    // ── Booking Detail ───────────────────────────────────────────────────────
    public class BookingDetailResponseDto
    {
        public int BookingId { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal TotalPrice { get; set; }
        public string Status { get; set; } = "";
        public bool CanCancel { get; set; }
        public List<BookingDetailItemDto> Details { get; set; } = new();
        public PaymentInfoDto? Payment { get; set; }
    }

    // ── User Profile ─────────────────────────────────────────────────────────
    public class UserProfileDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string? Email { get; set; }
        public int LoyaltyPoints { get; set; }
        public string Status { get; set; } = "";
        public string Role { get; set; } = "";
        public int TotalBookings { get; set; }
        public int CompletedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public decimal TotalSpent { get; set; }
    }

    // ── Voucher ──────────────────────────────────────────────────────────────
    public class VoucherValidationDto
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = "";
        public decimal DiscountAmount { get; set; }
        public string? Code { get; set; }
    }

    // ── User Orders ──────────────────────────────────────────────────────────
    public class UserOrderDto
    {
        public int OrderId { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal TotalAmount { get; set; }
        public int? BookingId { get; set; }
        public List<OrderDetailItemDto> Items { get; set; } = new();
    }

    public class OrderDetailItemDto
    {
        public string ProductName { get; set; } = "";
        public string Category { get; set; } = "";
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }
    }

    // ── Update Profile ───────────────────────────────────────────────────────
    public class UpdateProfileDto
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
    }

    // ── Purchase Products with Booking ───────────────────────────────────────
    public class PurchaseProductDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class CreateOrderWithBookingDto
    {
        public int BookingId { get; set; }
        public List<PurchaseProductDto> Products { get; set; } = new();
    }

    public class OrderWithBookingResponseDto
    {
        public int OrderId { get; set; }
        public int BookingId { get; set; }
        public decimal OrderTotal { get; set; }
        public decimal BookingTotal { get; set; }
        public decimal GrandTotal { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemResponseDto> Items { get; set; } = new();
    }

    public class OrderItemResponseDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = "";
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }
    }

    // ── Available Products for Purchase ──────────────────────────────────────
    public class AvailableProductDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Category { get; set; } = "";
        public decimal UnitPrice { get; set; }
        public int StockQuantity { get; set; }
        public string? ImageUrl { get; set; }
    }
}