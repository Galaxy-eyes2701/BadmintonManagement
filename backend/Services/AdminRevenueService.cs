using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using System.Text;
using backend.DTOs;
using backend.Interface.Repository;
using backend.Interface.Service;
using backend.Dtos.Admin;

namespace backend.Services
{
    public class AdminRevenueService : IAdminRevenueService
    {
        private readonly IAdminRevenueRepository _repo;

        public AdminRevenueService(IAdminRevenueRepository repo) => _repo = repo;

        // ─── Resolve date range với default ──────────────────────────────────────
        private static (DateTime start, DateTime end) Resolve(RevenueFilterDto filter)
        {
            var end   = filter.EndDate   ?? DateTime.Now;
            var start = filter.StartDate ?? end.AddMonths(-1);
            // Đảm bảo end là cuối ngày
            return (start.Date, end.Date.AddDays(1).AddTicks(-1));
        }

        public async Task<RevenueSummaryDto> GetSummaryAsync(RevenueFilterDto filter)
        {
            var (start, end) = Resolve(filter);
            return await _repo.GetSummaryAsync(start, end);
        }

        public async Task<IEnumerable<RevenueByBranchDto>> GetRevenueByBranchAsync(RevenueFilterDto filter)
        {
            var (start, end) = Resolve(filter);
            return await _repo.GetRevenueByBranchAsync(start, end);
        }

        public async Task<IEnumerable<RevenueByCourtTypeDto>> GetRevenueByCourtTypeAsync(RevenueFilterDto filter)
        {
            var (start, end) = Resolve(filter);
            return await _repo.GetRevenueByCourtTypeAsync(start, end);
        }

        public async Task<IEnumerable<RevenueByPeriodDto>> GetRevenueByPeriodAsync(RevenueFilterDto filter)
        {
            var (start, end) = Resolve(filter);
            var validPeriod = filter.Period?.ToLower() is "day" or "month" or "year"
                ? filter.Period.ToLower()
                : "month";
            return await _repo.GetRevenueByPeriodAsync(start, end, validPeriod, filter.BranchId);
        }

        public async Task<IEnumerable<TopCourtDto>> GetTopCourtsAsync(RevenueFilterDto filter, int top = 10)
        {
            var (start, end) = Resolve(filter);
            top = Math.Clamp(top, 1, 50);
            return await _repo.GetTopCourtsAsync(start, end, top);
        }

        public async Task<BookingStatsDto> GetBookingStatsAsync(RevenueFilterDto filter)
        {
            var (start, end) = Resolve(filter);
            return await _repo.GetBookingStatsAsync(start, end);
        }

        public async Task<IEnumerable<OrderRevenueDto>> GetOrderRevenueAsync(RevenueFilterDto filter)
        {
            var (start, end) = Resolve(filter);
            return await _repo.GetOrderRevenueAsync(start, end);
        }

        // ─── Export CSV ───────────────────────────────────────────────────────────
        public async Task<byte[]> ExportCsvAsync(RevenueFilterDto filter)
        {
            var (start, end) = Resolve(filter);
            var validPeriod = filter.Period?.ToLower() is "day" or "month" or "year"
                ? filter.Period.ToLower()
                : "month";

            var rows = await _repo.GetExportDataAsync(start, end, validPeriod);

            var sb = new StringBuilder();
            sb.AppendLine("Period,Branch,Booking Revenue,Order Revenue,Total Revenue,Total Bookings");

            foreach (var r in rows)
                sb.AppendLine($"{r.Period},{EscapeCsv(r.Branch)},{r.BookingRevenue},{r.OrderRevenue},{r.Total},{r.Bookings}");

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        private static string EscapeCsv(string value)
            => value.Contains(',') ? $"\"{value}\"" : value;
    }
}