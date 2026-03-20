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

    // ============================================
    // DEPOSIT PAYMENT DTOs
    // ============================================

    /// <summary>
    /// Request to create VNPay deposit payment (50% of court total)
    /// </summary>
    public class CreateDepositPaymentDto
    {
        [Required]
        public int BookingId { get; set; }
    }

    /// <summary>
    /// Response for deposit payment creation
    /// </summary>
    public class DepositPaymentResponseDto
    {
        public int BookingId { get; set; }
        public decimal CourtTotal { get; set; }
        public decimal DepositAmount { get; set; } // 50% of court total
        public decimal RemainingCourtAmount { get; set; } // 50% remaining
        public string? PaymentUrl { get; set; } // VNPay URL
        public string? Message { get; set; }
    }

    /// <summary>
    /// Summary of booking payment status
    /// </summary>
    public class BookingPaymentSummaryDto
    {
        public int BookingId { get; set; }
        public string BookingStatus { get; set; } = "";
        public decimal CourtTotal { get; set; }
        public decimal ProductTotal { get; set; }
        public decimal GrandTotal { get; set; }
        public decimal DepositPaid { get; set; }
        public decimal RemainingCourtAmount { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal RemainingTotal { get; set; }
        public string PaymentStatus { get; set; } = ""; // pending_deposit, deposit_paid, fully_paid
        public List<PaymentRecordDto> Payments { get; set; } = new();
    }

    /// <summary>
    /// Payment record for display
    /// </summary>
    public class PaymentRecordDto
    {
        public int PaymentId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "";
        public string Status { get; set; } = "";
        public string? TransactionId { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string PaymentType { get; set; } = ""; // deposit, remaining, product
    }

    /// <summary>
    /// Request to pay remaining amount (court + optional products)
    /// </summary>
    public class PayRemainingDto
    {
        [Required]
        public int BookingId { get; set; }

        /// <summary>
        /// Product payment option: "online" (pay now with VNPay) or "onsite" (pay at court)
        /// </summary>
        [Required]
        public string ProductPaymentOption { get; set; } = "onsite"; // online, onsite
    }

    /// <summary>
    /// Response for remaining payment
    /// </summary>
    public class RemainingPaymentResponseDto
    {
        public int BookingId { get; set; }
        public decimal RemainingCourtAmount { get; set; }
        public decimal ProductTotal { get; set; }
        public decimal TotalToPay { get; set; }
        public string? PaymentUrl { get; set; } // VNPay URL if online payment
        public string? Message { get; set; }
        public bool Success { get; set; }
    }
}