using backend.DTOs;
using backend.Models;

namespace backend.Services
{
    public interface IPaymentService
    {
        Task<Payment> ProcessPaymentAsync(CreatePaymentDto paymentDto);

        // Hàm phục vụ Dashboard (Biểu đồ doanh thu)
        Task<object> GetRevenueReportAsync(int month, int year);
        Task<object> GetRecentTransactionsAsync(int limit = 5);
    }
}