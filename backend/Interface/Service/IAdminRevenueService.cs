using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Dtos.Admin;
using backend.DTOs;

namespace backend.Interface.Service
{
    public interface IAdminRevenueService
    {
        Task<RevenueSummaryDto>                  GetSummaryAsync(RevenueFilterDto filter);
        Task<IEnumerable<RevenueByBranchDto>>    GetRevenueByBranchAsync(RevenueFilterDto filter);
        Task<IEnumerable<RevenueByCourtTypeDto>> GetRevenueByCourtTypeAsync(RevenueFilterDto filter);
        Task<IEnumerable<RevenueByPeriodDto>>    GetRevenueByPeriodAsync(RevenueFilterDto filter);
        Task<IEnumerable<TopCourtDto>>           GetTopCourtsAsync(RevenueFilterDto filter, int top = 10);
        Task<BookingStatsDto>                    GetBookingStatsAsync(RevenueFilterDto filter);
        Task<IEnumerable<OrderRevenueDto>>       GetOrderRevenueAsync(RevenueFilterDto filter);
        Task<byte[]>                             ExportCsvAsync(RevenueFilterDto filter);
    }
}