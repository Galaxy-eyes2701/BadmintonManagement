using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Dtos.Admin;

namespace backend.Interface.Repository
{
    public interface IAdminRevenueRepository
    {
        // ─── Tổng quan ─────────────────────────────────────────────────────────
        Task<RevenueSummaryDto> GetSummaryAsync(DateTime startDate, DateTime endDate);

        // ─── Theo chi nhánh ────────────────────────────────────────────────────
        Task<IEnumerable<RevenueByBranchDto>> GetRevenueByBranchAsync(DateTime startDate, DateTime endDate);

        // ─── Theo loại sân ─────────────────────────────────────────────────────
        Task<IEnumerable<RevenueByCourtTypeDto>> GetRevenueByCourtTypeAsync(DateTime startDate, DateTime endDate);

        // ─── Theo kỳ (day/month/year) ──────────────────────────────────────────
        Task<IEnumerable<RevenueByPeriodDto>> GetRevenueByPeriodAsync(
            DateTime startDate, DateTime endDate, string period, int? branchId);

        // ─── Top sân hot ───────────────────────────────────────────────────────
        Task<IEnumerable<TopCourtDto>> GetTopCourtsAsync(DateTime startDate, DateTime endDate, int top);

        // ─── Thống kê booking ──────────────────────────────────────────────────
        Task<BookingStatsDto> GetBookingStatsAsync(DateTime startDate, DateTime endDate);

        // ─── Doanh thu đơn hàng ────────────────────────────────────────────────
        Task<IEnumerable<OrderRevenueDto>> GetOrderRevenueAsync(DateTime startDate, DateTime endDate);

        // ─── Export raw data ───────────────────────────────────────────────────
        Task<IEnumerable<RevenueExportRowDto>> GetExportDataAsync(
            DateTime startDate, DateTime endDate, string period);
    }
}