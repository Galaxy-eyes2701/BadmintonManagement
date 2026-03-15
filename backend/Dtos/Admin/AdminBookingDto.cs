using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;


namespace backend.Dtos.Admin
{
    // ── Response: danh sách booking ──────────────────────────────────────────
    public class AdminBookingListDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string CustomerName { get; set; } = null!;
        public string CustomerPhone { get; set; } = null!;
        public DateTime? CreatedAt { get; set; }
        public decimal? TotalPrice { get; set; }
        public string Status { get; set; } = null!;
        public int TotalDetails { get; set; }
    }

    // ── Response: chi tiết 1 booking ─────────────────────────────────────────
    public class AdminBookingDetailDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string CustomerName { get; set; } = null!;
        public string CustomerPhone { get; set; } = null!;
        public string? CustomerEmail { get; set; }
        public DateTime? CreatedAt { get; set; }
        public decimal? TotalPrice { get; set; }
        public string Status { get; set; } = null!;
        public List<AdminBookingDetailItemDto> Details { get; set; } = new();
    }

    public class AdminBookingDetailItemDto
    {
        public int Id { get; set; }
        public int CourtId { get; set; }
        public string CourtName { get; set; } = null!;
        public string BranchName { get; set; } = null!;
        public string CourtTypeName { get; set; } = null!;
        public DateOnly PlayDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public decimal PriceSnapshot { get; set; }
    }

    // ── Request: đổi trạng thái booking ──────────────────────────────────────
    public class AdminBookingUpdateStatusDto
    {
        /// <summary>confirmed | cancelled</summary>
        public string Status { get; set; } = null!;
        public string? Note { get; set; }
    }

    // ── Query filter ──────────────────────────────────────────────────────────
    public class AdminBookingFilterDto
    {
        public string? Status { get; set; }           // pending | confirmed | cancelled
        public int? BranchId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Search { get; set; }           // tên hoặc SĐT khách
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    // ── Response: phân trang ──────────────────────────────────────────────────
    public class AdminBookingPagedDto
    {
        public List<AdminBookingListDto> Items { get; set; } = new();
        public int TotalItems { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalItems / PageSize);
    }
}