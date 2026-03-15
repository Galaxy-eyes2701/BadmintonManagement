using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Dtos.Admin;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class AdminBookingRepository : IAdminBookingRepository
    {
        private readonly BadmintonManagementContext _ctx;

        public AdminBookingRepository(BadmintonManagementContext ctx) => _ctx = ctx;

        // ═══════════════════════════════════════════════════════════════════════
        // GET ALL — filter + phân trang
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<AdminBookingPagedDto> GetAllAsync(AdminBookingFilterDto filter)
        {
            var query = _ctx.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Court)
                        .ThenInclude(c => c.Branch)
                .AsQueryable();

            // ── Filter theo status ────────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(b => b.Status.ToLower() == filter.Status.ToLower());

            // ── Filter theo chi nhánh ─────────────────────────────────────────
            if (filter.BranchId.HasValue)
                query = query.Where(b => b.BookingDetails
                    .Any(bd => bd.Court.BranchId == filter.BranchId.Value));

            // ── Filter theo ngày tạo ──────────────────────────────────────────
            if (filter.FromDate.HasValue)
                query = query.Where(b => b.CreatedAt >= filter.FromDate.Value);
            if (filter.ToDate.HasValue)
                query = query.Where(b => b.CreatedAt <= filter.ToDate.Value.AddDays(1).AddTicks(-1));

            // ── Tìm theo tên hoặc SĐT khách ──────────────────────────────────
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var keyword = filter.Search.Trim().ToLower();
                query = query.Where(b =>
                    b.User.FullName.ToLower().Contains(keyword) ||
                    b.User.Phone.Contains(keyword));
            }

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(b => b.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(b => new AdminBookingListDto
                {
                    Id            = b.Id,
                    UserId        = b.UserId,
                    CustomerName  = b.User.FullName,
                    CustomerPhone = b.User.Phone,
                    CreatedAt     = b.CreatedAt,
                    TotalPrice    = b.TotalPrice,
                    Status        = b.Status,
                    TotalDetails  = b.BookingDetails.Count
                })
                .ToListAsync();

            return new AdminBookingPagedDto
            {
                Items      = items,
                TotalItems = totalItems,
                Page       = filter.Page,
                PageSize   = filter.PageSize
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // GET BY ID — chi tiết đầy đủ
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<AdminBookingDetailDto?> GetByIdAsync(int id)
        {
            var booking = await _ctx.Bookings
                .Include(b => b.User)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Court)
                        .ThenInclude(c => c.Branch)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Court)
                        .ThenInclude(c => c.CourtType)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TimeSlot)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null) return null;

            return new AdminBookingDetailDto
            {
                Id            = booking.Id,
                UserId        = booking.UserId,
                CustomerName  = booking.User.FullName,
                CustomerPhone = booking.User.Phone,
                CustomerEmail = booking.User.Email,
                CreatedAt     = booking.CreatedAt,
                TotalPrice    = booking.TotalPrice,
                Status        = booking.Status,
                Details       = booking.BookingDetails.Select(bd => new AdminBookingDetailItemDto
                {
                    Id            = bd.Id,
                    CourtId       = bd.CourtId,
                    CourtName     = bd.Court.Name,
                    BranchName    = bd.Court.Branch.Name,
                    CourtTypeName = bd.Court.CourtType.Name,
                    PlayDate      = bd.PlayDate,
                    StartTime     = bd.TimeSlot.StartTime,
                    EndTime       = bd.TimeSlot.EndTime,
                    PriceSnapshot = bd.PriceSnapshot
                }).ToList()
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // CONFIRM — pending → confirmed
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<bool> ConfirmAsync(int id)
        {
            var booking = await _ctx.Bookings.FindAsync(id);
            if (booking == null) return false;

            booking.Status = "confirmed";
            await _ctx.SaveChangesAsync();
            return true;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // CANCEL — hủy bất kỳ trạng thái
        // ═══════════════════════════════════════════════════════════════════════
        public async Task<bool> CancelAsync(int id)
        {
            var booking = await _ctx.Bookings.FindAsync(id);
            if (booking == null) return false;

            booking.Status = "cancelled";
            await _ctx.SaveChangesAsync();
            return true;
        }
    }
}