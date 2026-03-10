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
            // 1. Nếu KHÔNG PHẢI khách vãng lai (khác 9999) thì mới check xem có đặt sân không
            if (paymentDto.BookingId != 9999)
            {
                var checkBooking = await _context.Bookings.FindAsync(paymentDto.BookingId);
                if (checkBooking == null)
                    throw new Exception("Không tìm thấy thông tin đặt sân.");
            }

            // 2. Tạo hóa đơn thanh toán (Nếu là 9999 thì lưu BookingId là null)
            var payment = new Payment
            {
                BookingId = paymentDto.BookingId == 9999 ? null : paymentDto.BookingId,
                Amount = paymentDto.Amount,
                PaymentMethod = paymentDto.PaymentMethod,
                TransactionId = paymentDto.TransactionId,
                CreatedAt = DateTime.Now,
                Status = "success"
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            // 3. Nếu là thanh toán sân thì tự động cập nhật trạng thái "Đã chốt"
            if (paymentDto.BookingId != 9999)
            {
                var booking = await _context.Bookings.FindAsync(paymentDto.BookingId);
                var totalPaid = await _context.Payments
                    .Where(p => p.BookingId == paymentDto.BookingId && p.Status == "success")
                    .SumAsync(p => p.Amount);

                if (totalPaid >= booking.TotalPrice && booking.Status != "confirmed")
                {
                    booking.Status = "confirmed";
                    _context.Bookings.Update(booking);
                    await _context.SaveChangesAsync();
                }
            }

            return payment;
        }
        public async Task<object> GetRevenueReportAsync(int month, int year)
        {
            var courtRevenue = await _context.Payments
                .Where(p => p.Status == "success" && p.CreatedAt.HasValue && p.CreatedAt.Value.Month == month && p.CreatedAt.Value.Year == year)
                .GroupBy(p => p.CreatedAt!.Value.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Total = g.Sum(p => p.Amount)
                })
                .ToListAsync();

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
        // Hàm tính toán Giao dịch gần đây
        public async Task<object> GetRecentTransactionsAsync(int limit = 5)
        {
            // 1. Lấy hóa đơn POS (Mua nước/vợt tại quầy - không có Booking)
            var recentOrders = await _context.Orders
                .Where(o => o.BookingId == null)
                .OrderByDescending(o => o.CreatedAt)
                .Take(limit)
                .Select(o => new
                {
                    Type = "POS",
                    Description = $"POS - Hóa đơn #{o.Id}",
                    Amount = o.TotalAmount,
                    Date = o.CreatedAt,
                    Icon = "shopping_basket",
                    Color = "text-[#0ea5e9]",
                    BgColor = "bg-[#0ea5e9]/10"
                }).ToListAsync();

            // 2. Lấy hóa đơn Thanh toán Sân
            var recentPayments = await _context.Payments
                .Where(p => p.Status == "success" && p.CreatedAt.HasValue && p.BookingId != null) // Thêm dòng p.BookingId != null ở đây
                .OrderByDescending(p => p.CreatedAt)
                .Take(limit)
                .Select(p => new
                {
                    Type = "COURT",
                    Description = $"Thanh toán Sân (Booking #{p.BookingId})",
                    Amount = p.Amount,
                    Date = p.CreatedAt!.Value,
                    Icon = "sports_tennis",
                    Color = "text-[#0c4a6e]",
                    BgColor = "bg-[#0c4a6e]/10"
                }).ToListAsync();

            // 3. Trộn 2 danh sách lại, sắp xếp mới nhất lên đầu
            var combined = recentOrders.Concat(recentPayments)
                .OrderByDescending(x => x.Date)
                .Take(limit)
                .Select(x => new
                {
                    x.Type,
                    x.Description,
                    x.Amount,
                    TimeAgo = GetTimeAgo(x.Date), // Hàm tính "Vừa xong", "10 phút trước"...
                    x.Icon,
                    x.Color,
                    x.BgColor
                })
                .ToList();

            return combined;
        }

        // Hàm phụ trợ tính thời gian
        private string GetTimeAgo(DateTime dateTime)
        {
            var span = DateTime.Now - dateTime;
            if (span.TotalMinutes < 1) return "Vừa xong";
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes} phút trước";
            if (span.TotalHours < 24) return $"{(int)span.TotalHours} giờ trước";
            return $"{(int)span.TotalDays} ngày trước";
        }
    }
}