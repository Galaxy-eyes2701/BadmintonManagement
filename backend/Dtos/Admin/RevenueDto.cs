using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Dtos.Admin
{
   
    // ─── Query params ────────────────────────────────────────────────────────────
    public class RevenueFilterDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate   { get; set; }
        public int?      BranchId  { get; set; }
        /// <summary>"day" | "month" | "year"</summary>
        public string Period { get; set; } = "month";
    }

    // ─── Tổng quan ───────────────────────────────────────────────────────────────
    public class RevenueSummaryDto
    {
        public decimal TotalRevenue        { get; set; }
        public decimal BookingRevenue      { get; set; }
        public decimal OrderRevenue        { get; set; }
        public int     TotalBookings       { get; set; }
        public int     CompletedBookings   { get; set; }
        public int     CancelledBookings   { get; set; }
        public int     TotalOrders         { get; set; }
        public int     TotalCustomers      { get; set; }
        public decimal AvgRevenuePerDay    { get; set; }
        public decimal RevenueGrowthRate   { get; set; }  // % so với kỳ trước
    }

    // ─── Doanh thu theo chi nhánh ────────────────────────────────────────────────
    public class RevenueByBranchDto
    {
        public int     BranchId      { get; set; }
        public string  BranchName    { get; set; } = null!;
        public decimal BookingRevenue { get; set; }
        public decimal OrderRevenue   { get; set; }
        public decimal TotalRevenue   { get; set; }
        public int     TotalBookings  { get; set; }
    }

    // ─── Doanh thu theo loại sân ─────────────────────────────────────────────────
    public class RevenueByCourtTypeDto
    {
        public int     CourtTypeId   { get; set; }
        public string  CourtTypeName { get; set; } = null!;
        public decimal TotalRevenue  { get; set; }
        public int     TotalBookings { get; set; }
        public decimal Percentage    { get; set; }  // % so với tổng
    }

    // ─── Doanh thu theo kỳ (ngày / tháng / năm) ──────────────────────────────────
    public class RevenueByPeriodDto
    {
        public string  Label          { get; set; } = null!;  // "2024-01", "2024-01-15", "2024"
        public decimal BookingRevenue { get; set; }
        public decimal OrderRevenue   { get; set; }
        public decimal TotalRevenue   { get; set; }
        public int     TotalBookings  { get; set; }
    }

    // ─── Sân hot nhất ────────────────────────────────────────────────────────────
    public class TopCourtDto
    {
        public int     CourtId       { get; set; }
        public string  CourtName     { get; set; } = null!;
        public string  BranchName    { get; set; } = null!;
        public string  CourtTypeName { get; set; } = null!;
        public int     TotalBookings { get; set; }
        public decimal TotalRevenue  { get; set; }
        public double  OccupancyRate { get; set; }  // % lấp đầy (booking / timeslot khả dụng)
    }

    // ─── Thống kê booking ────────────────────────────────────────────────────────
    public class BookingStatsDto
    {
        public int TotalBookings     { get; set; }
        public int PendingBookings   { get; set; }
        public int ConfirmedBookings { get; set; }
        public int CompletedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public decimal TotalRevenue  { get; set; }
        public decimal AvgBookingValue { get; set; }

        public List<BookingByHourDto> PeakHours { get; set; } = new();
    }

    public class BookingByHourDto
    {
        public int Hour          { get; set; }
        public int TotalBookings { get; set; }
    }

    // ─── Doanh thu đơn hàng (order) ─────────────────────────────────────────────
    public class OrderRevenueDto
    {
        public int     OrderId       { get; set; }
        public int?    BookingId     { get; set; }
        public decimal TotalAmount   { get; set; }
        public DateTime CreatedAt    { get; set; }
        public List<OrderDetailSummaryDto> Details { get; set; } = new();
    }

    public class OrderDetailSummaryDto
    {
        public string  ProductName     { get; set; } = null!;
        public int     Quantity        { get; set; }
        public decimal UnitPrice       { get; set; }
        public decimal Subtotal        { get; set; }
    }

    // ─── Export wrapper ──────────────────────────────────────────────────────────
    public class RevenueExportRowDto
    {
        public string  Period         { get; set; } = null!;
        public string  Branch         { get; set; } = null!;
        public decimal BookingRevenue { get; set; }
        public decimal OrderRevenue   { get; set; }
        public decimal Total          { get; set; }
        public int     Bookings       { get; set; }
    }

}