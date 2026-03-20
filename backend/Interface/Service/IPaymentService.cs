using backend.DTOs;
using backend.Models;

namespace backend.Interface.Service
{
    public interface IPaymentService
    {
        Task<Payment> ProcessPaymentAsync(CreatePaymentDto paymentDto);

        // Hàm phục vụ Dashboard (Biểu đồ doanh thu)
        Task<object> GetRevenueReportAsync(int month, int year);
        Task<object> GetRecentTransactionsAsync(int limit = 5);

        // ============================================
        // DEPOSIT PAYMENT METHODS
        // ============================================

        /// <summary>
        /// Get booking payment summary (deposit, remaining, products)
        /// </summary>
        Task<BookingPaymentSummaryDto> GetBookingPaymentSummaryAsync(int bookingId);

        /// <summary>
        /// Create a deposit payment record (50% of court total)
        /// </summary>
        Task<Payment> CreateDepositPaymentAsync(int bookingId, decimal amount, string transactionId);

        /// <summary>
        /// Process remaining court payment after deposit
        /// </summary>
        Task<Payment> ProcessRemainingCourtPaymentAsync(int bookingId, decimal amount, string paymentMethod, string? transactionId = null);

        /// <summary>
        /// Process product payment (online or onsite)
        /// </summary>
        Task<Payment> ProcessProductPaymentAsync(int bookingId, decimal amount, string paymentMethod, string? transactionId = null);
    }
}