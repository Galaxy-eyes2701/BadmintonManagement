using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly BadmintonManagementContext _context;

        public PaymentService(BadmintonManagementContext context)
        {
            _context = context;
        }

        public async Task<Payment> ProcessPaymentAsync(CreatePaymentDto paymentDto)
        {
            var booking = await _context.Bookings.FindAsync(paymentDto.BookingId);
            if (booking == null)
                throw new Exception("Không tìm thấy thông tin đặt sân.");

            // 1. Tạo bản ghi Thanh toán
            var payment = new Payment
            {
                BookingId = paymentDto.BookingId,
                Amount = paymentDto.Amount,
                PaymentMethod = paymentDto.PaymentMethod,
                TransactionId = paymentDto.TransactionId,
                CreatedAt = DateTime.Now,
                Status = "success"
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync(); // Lưu để có dữ liệu cộng dồn

            // 2. Tính tổng số tiền khách ĐÃ TRẢ cho Booking này
            var totalPaid = await _context.Payments
                .Where(p => p.BookingId == paymentDto.BookingId && p.Status == "success")
                .SumAsync(p => p.Amount);

            // 3. Nếu khách đã trả đủ (hoặc dư) -> Tự động chốt đơn
            if (totalPaid >= booking.TotalPrice && booking.Status != "confirmed")
            {
                booking.Status = "confirmed"; // Cập nhật trạng thái
                _context.Bookings.Update(booking);
                await _context.SaveChangesAsync();
            }

            return payment;
        }

        // 4. Lấy dữ liệu cho biểu đồ Doanh thu (Gộp cả tiền Sân + tiền Bán nước)
        public async Task<object> GetRevenueReportAsync(int month, int year)
        {
            // Doanh thu từ tiền đặt sân (Payments)
            var courtRevenue = await _context.Payments
                .Where(p => p.Status == "success" && p.CreatedAt.Value.Month == month && p.CreatedAt.Value.Year == year)
                .GroupBy(p => p.CreatedAt.Value.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Total = g.Sum(p => p.Amount)
                })
                .ToListAsync();

            // Doanh thu từ tiền bán nước vãng lai (Orders không có BookingId)
            var posRevenue = await _context.Orders
                .Where(o => o.BookingId == null && o.CreatedAt.Month == month && o.CreatedAt.Year == year)
                .GroupBy(o => o.CreatedAt.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Total = g.Sum(o => o.TotalAmount)
                })
                .ToListAsync();

            return new
            {
                Month = month,
                Year = year,
                CourtRevenue = courtRevenue,
                PosRevenue = posRevenue
            };
        }
    }
}