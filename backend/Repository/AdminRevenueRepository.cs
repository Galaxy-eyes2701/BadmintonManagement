using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Dtos.Admin;
using backend.DTOs;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class AdminRevenueRepository : IAdminRevenueRepository
    {
        private readonly BadmintonManagementContext _ctx;

        public AdminRevenueRepository(BadmintonManagementContext ctx) => _ctx = ctx;

        // Helper: kiểm tra status không phải cancelled (case-insensitive)
        private static bool IsNotCancelled(string status)
            => !string.Equals(status, "cancelled", StringComparison.OrdinalIgnoreCase);

        // ═══════════════════════════════════════════════════════════════════════
        // 1. TỔNG QUAN (Summary)
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<RevenueSummaryDto> GetSummaryAsync(DateTime startDate, DateTime endDate)
        {
            var bookings = await _ctx.Bookings
                .Where(b => b.CreatedAt >= startDate && b.CreatedAt <= endDate)
                .ToListAsync();

            // Tất cả booking không bị huỷ = tính doanh thu
            var activeBookings    = bookings.Where(b => IsNotCancelled(b.Status)).ToList();
            var cancelledBookings = bookings.Where(b => !IsNotCancelled(b.Status)).ToList();

            decimal bookingRevenue = activeBookings.Sum(b => b.TotalPrice ?? 0);

            var orders = await _ctx.Orders
                .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate)
                .ToListAsync();
            decimal orderRevenue = orders.Sum(o => o.TotalAmount);

            int totalCustomers = await _ctx.Users
                .Where(u => u.Role.ToLower() == "customer")
                .CountAsync();

            // Growth rate so với kỳ trước
            var span      = endDate - startDate;
            var prevStart = startDate - span;
            var prevEnd   = startDate;

            var prevBookings = await _ctx.Bookings
                .Where(b => b.CreatedAt >= prevStart && b.CreatedAt < prevEnd)
                .ToListAsync();

            decimal prevRevenue = prevBookings
                .Where(b => IsNotCancelled(b.Status))
                .Sum(b => b.TotalPrice ?? 0);

            prevRevenue += await _ctx.Orders
                .Where(o => o.CreatedAt >= prevStart && o.CreatedAt < prevEnd)
                .SumAsync(o => o.TotalAmount);

            decimal totalRevenue = bookingRevenue + orderRevenue;
            double  days         = Math.Max((endDate - startDate).TotalDays, 1);

            decimal growthRate = prevRevenue == 0
                ? 0
                : Math.Round((totalRevenue - prevRevenue) / prevRevenue * 100, 2);

            return new RevenueSummaryDto
            {
                TotalRevenue      = totalRevenue,
                BookingRevenue    = bookingRevenue,
                OrderRevenue      = orderRevenue,
                TotalBookings     = bookings.Count,
                CompletedBookings = activeBookings.Count,
                CancelledBookings = cancelledBookings.Count,
                TotalOrders       = orders.Count,
                TotalCustomers    = totalCustomers,
                AvgRevenuePerDay  = Math.Round(totalRevenue / (decimal)days, 2),
                RevenueGrowthRate = growthRate
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 2. DOANH THU THEO CHI NHÁNH
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<IEnumerable<RevenueByBranchDto>> GetRevenueByBranchAsync(
            DateTime startDate, DateTime endDate)
        {
            var bookingByBranch = await _ctx.BookingDetails
                .Include(bd => bd.Booking)
                .Include(bd => bd.Court).ThenInclude(c => c.Branch)
                .Where(bd => bd.Booking.CreatedAt >= startDate
                          && bd.Booking.CreatedAt <= endDate
                          && bd.Booking.Status.ToLower() != "cancelled")
                .GroupBy(bd => new { bd.Court.BranchId, bd.Court.Branch.Name })
                .Select(g => new
                {
                    BranchId       = g.Key.BranchId,
                    BranchName     = g.Key.Name,
                    BookingRevenue = g.Sum(x => x.PriceSnapshot),
                    TotalBookings  = g.Select(x => x.BookingId).Distinct().Count()
                })
                .ToListAsync();

            var orderByBranch = await _ctx.Orders
                .Include(o => o.Booking).ThenInclude(b => b!.BookingDetails)
                    .ThenInclude(bd => bd.Court).ThenInclude(c => c.Branch)
                .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate
                         && o.BookingId != null)
                .ToListAsync();

            var orderGrouped = orderByBranch
                .SelectMany(o => o.Booking!.BookingDetails.Select(bd => new
                {
                    bd.Court.BranchId,
                    BranchName = bd.Court.Branch.Name,
                    Share = o.TotalAmount / o.Booking!.BookingDetails.Count
                }))
                .GroupBy(x => new { x.BranchId, x.BranchName })
                .ToDictionary(g => g.Key.BranchId, g => g.Sum(x => x.Share));

            var branches = await _ctx.Branches.ToListAsync();

            return branches.Select(b =>
            {
                var booking = bookingByBranch.FirstOrDefault(x => x.BranchId == b.Id);
                orderGrouped.TryGetValue(b.Id, out decimal orderRev);
                decimal bookingRev = booking?.BookingRevenue ?? 0;
                return new RevenueByBranchDto
                {
                    BranchId       = b.Id,
                    BranchName     = b.Name,
                    BookingRevenue = bookingRev,
                    OrderRevenue   = orderRev,
                    TotalRevenue   = bookingRev + orderRev,
                    TotalBookings  = booking?.TotalBookings ?? 0
                };
            }).OrderByDescending(x => x.TotalRevenue);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 3. DOANH THU THEO LOẠI SÂN
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<IEnumerable<RevenueByCourtTypeDto>> GetRevenueByCourtTypeAsync(
            DateTime startDate, DateTime endDate)
        {
            var data = await _ctx.BookingDetails
                .Include(bd => bd.Booking)
                .Include(bd => bd.Court).ThenInclude(c => c.CourtType)
                .Where(bd => bd.Booking.CreatedAt >= startDate
                          && bd.Booking.CreatedAt <= endDate
                          && bd.Booking.Status.ToLower() != "cancelled")
                .GroupBy(bd => new { bd.Court.CourtTypeId, bd.Court.CourtType.Name })
                .Select(g => new RevenueByCourtTypeDto
                {
                    CourtTypeId   = g.Key.CourtTypeId,
                    CourtTypeName = g.Key.Name,
                    TotalRevenue  = g.Sum(x => x.PriceSnapshot),
                    TotalBookings = g.Select(x => x.BookingId).Distinct().Count()
                })
                .ToListAsync();

            decimal grand = data.Sum(x => x.TotalRevenue);
            foreach (var item in data)
                item.Percentage = grand == 0 ? 0 : Math.Round(item.TotalRevenue / grand * 100, 2);

            return data.OrderByDescending(x => x.TotalRevenue);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 4. DOANH THU THEO KỲ
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<IEnumerable<RevenueByPeriodDto>> GetRevenueByPeriodAsync(
            DateTime startDate, DateTime endDate, string period, int? branchId)
        {
            var bookingQuery = _ctx.BookingDetails
                .Include(bd => bd.Booking)
                .Include(bd => bd.Court)
                .Where(bd => bd.Booking.CreatedAt >= startDate
                          && bd.Booking.CreatedAt <= endDate
                          && bd.Booking.Status.ToLower() != "cancelled");

            if (branchId.HasValue)
                bookingQuery = bookingQuery.Where(bd => bd.Court.BranchId == branchId.Value);

            var rawBooking = await bookingQuery
                .Select(bd => new
                {
                    bd.Booking.CreatedAt,
                    bd.PriceSnapshot,
                    bd.BookingId
                })
                .ToListAsync();

            var rawOrder = await _ctx.Orders
                .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate)
                .Select(o => new { o.CreatedAt, o.TotalAmount })
                .ToListAsync();

            string Label(DateTime? dt) => period.ToLower() switch
            {
                "day"  => dt?.ToString("yyyy-MM-dd") ?? "",
                "year" => dt?.ToString("yyyy") ?? "",
                _      => dt?.ToString("yyyy-MM") ?? ""
            };

            var bookingGrouped = rawBooking
                .GroupBy(x => Label(x.CreatedAt))
                .ToDictionary(
                    g => g.Key,
                    g => (Revenue: g.Sum(x => x.PriceSnapshot),
                          Count: g.Select(x => x.BookingId).Distinct().Count()));

            var orderGrouped = rawOrder
                .GroupBy(x => Label(x.CreatedAt))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.TotalAmount));

            var labels = GenerateLabels(startDate, endDate, period);

            return labels.Select(label =>
            {
                bookingGrouped.TryGetValue(label, out var bk);
                orderGrouped.TryGetValue(label, out decimal or);
                return new RevenueByPeriodDto
                {
                    Label          = label,
                    BookingRevenue = bk.Revenue,
                    OrderRevenue   = or,
                    TotalRevenue   = bk.Revenue + or,
                    TotalBookings  = bk.Count
                };
            });
        }

        private static IEnumerable<string> GenerateLabels(DateTime start, DateTime end, string period)
        {
            var labels = new List<string>();
            var cur = start;
            while (cur <= end)
            {
                labels.Add(period.ToLower() switch
                {
                    "day"  => cur.ToString("yyyy-MM-dd"),
                    "year" => cur.ToString("yyyy"),
                    _      => cur.ToString("yyyy-MM")
                });
                cur = period.ToLower() switch
                {
                    "day"  => cur.AddDays(1),
                    "year" => cur.AddYears(1),
                    _      => cur.AddMonths(1)
                };
            }
            return labels.Distinct();
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 5. TOP SÂN
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<IEnumerable<TopCourtDto>> GetTopCourtsAsync(
            DateTime startDate, DateTime endDate, int top)
        {
            var data = await _ctx.BookingDetails
                .Include(bd => bd.Booking)
                .Include(bd => bd.Court).ThenInclude(c => c.Branch)
                .Include(bd => bd.Court).ThenInclude(c => c.CourtType)
                .Where(bd => bd.Booking.CreatedAt >= startDate
                          && bd.Booking.CreatedAt <= endDate
                          && bd.Booking.Status.ToLower() != "cancelled")
                .GroupBy(bd => new
                {
                    bd.CourtId,
                    CourtName     = bd.Court.Name,
                    BranchName    = bd.Court.Branch.Name,
                    CourtTypeName = bd.Court.CourtType.Name
                })
                .Select(g => new TopCourtDto
                {
                    CourtId       = g.Key.CourtId,
                    CourtName     = g.Key.CourtName,
                    BranchName    = g.Key.BranchName,
                    CourtTypeName = g.Key.CourtTypeName,
                    TotalBookings = g.Select(x => x.BookingId).Distinct().Count(),
                    TotalRevenue  = g.Sum(x => x.PriceSnapshot)
                })
                .OrderByDescending(x => x.TotalRevenue)
                .Take(top)
                .ToListAsync();

            double totalDays  = (endDate - startDate).TotalDays + 1;
            int    totalSlots = await _ctx.TimeSlots.CountAsync();
            double maxSlots   = totalDays * totalSlots;

            foreach (var item in data)
                item.OccupancyRate = maxSlots == 0
                    ? 0
                    : Math.Round(item.TotalBookings / maxSlots * 100, 2);

            return data;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 6. THỐNG KÊ BOOKING
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<BookingStatsDto> GetBookingStatsAsync(DateTime startDate, DateTime endDate)
        {
            var bookings = await _ctx.Bookings
                .Where(b => b.CreatedAt >= startDate && b.CreatedAt <= endDate)
                .ToListAsync();

            var activeList = bookings.Where(b => IsNotCancelled(b.Status)).ToList();
            decimal totalRev = activeList.Sum(b => b.TotalPrice ?? 0);

            var peakHours = await _ctx.BookingDetails
                .Include(bd => bd.TimeSlot)
                .Include(bd => bd.Booking)
                .Where(bd => bd.Booking.CreatedAt >= startDate
                          && bd.Booking.CreatedAt <= endDate
                          && bd.Booking.Status.ToLower() != "cancelled")
                .GroupBy(bd => bd.TimeSlot.StartTime.Hour)
                .Select(g => new BookingByHourDto
                {
                    Hour          = g.Key,
                    TotalBookings = g.Select(x => x.BookingId).Distinct().Count()
                })
                .OrderBy(x => x.Hour)
                .ToListAsync();

            return new BookingStatsDto
            {
                TotalBookings     = bookings.Count,
                PendingBookings   = bookings.Count(b =>
                    string.Equals(b.Status, "pending",   StringComparison.OrdinalIgnoreCase)),
                ConfirmedBookings = bookings.Count(b =>
                    string.Equals(b.Status, "confirmed", StringComparison.OrdinalIgnoreCase)),
                CompletedBookings = activeList.Count,
                CancelledBookings = bookings.Count(b =>
                    string.Equals(b.Status, "cancelled", StringComparison.OrdinalIgnoreCase)),
                TotalRevenue      = totalRev,
                AvgBookingValue   = activeList.Count == 0
                    ? 0
                    : Math.Round(totalRev / activeList.Count, 2),
                PeakHours         = peakHours
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 7. DOANH THU ĐƠN HÀNG
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<IEnumerable<OrderRevenueDto>> GetOrderRevenueAsync(
            DateTime startDate, DateTime endDate)
        {
            var orders = await _ctx.Orders
                .Include(o => o.OrderDetails).ThenInclude(od => od.Product)
                .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(o => new OrderRevenueDto
            {
                OrderId     = o.Id,
                BookingId   = o.BookingId,
                TotalAmount = o.TotalAmount,
                CreatedAt   = o.CreatedAt,
                Details     = o.OrderDetails.Select(od => new OrderDetailSummaryDto
                {
                    ProductName = od.Product.Name,
                    Quantity    = od.Quantity,
                    UnitPrice   = od.UnitPriceSnapshot,
                    Subtotal    = od.Quantity * od.UnitPriceSnapshot
                }).ToList()
            });
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 8. EXPORT RAW DATA
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<IEnumerable<RevenueExportRowDto>> GetExportDataAsync(
            DateTime startDate, DateTime endDate, string period)
        {
            var byPeriod = await GetRevenueByPeriodAsync(startDate, endDate, period, null);

            return byPeriod.Select(p => new RevenueExportRowDto
            {
                Period         = p.Label,
                Branch         = "All",
                BookingRevenue = p.BookingRevenue,
                OrderRevenue   = p.OrderRevenue,
                Total          = p.TotalRevenue,
                Bookings       = p.TotalBookings
            });
        }
    }
}