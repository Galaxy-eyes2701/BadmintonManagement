using System.Threading.Tasks;
using backend.Dtos.Admin;
using backend.Interface.Repository;
using backend.Interface.Service;

namespace backend.Services
{
    public class AdminBookingService : IAdminBookingService
    {
        private readonly IAdminBookingRepository _repo;

        public AdminBookingService(IAdminBookingRepository repo) => _repo = repo;

        // ── Lấy danh sách có filter + phân trang ─────────────────────────────
        public async Task<AdminBookingPagedDto> GetAllAsync(AdminBookingFilterDto filter)
        {
            // Validate page
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1 || filter.PageSize > 100) filter.PageSize = 10;

            return await _repo.GetAllAsync(filter);
        }

        // ── Lấy chi tiết 1 booking ────────────────────────────────────────────
        public async Task<AdminBookingDetailDto?> GetByIdAsync(int id)
        {
            return await _repo.GetByIdAsync(id);
        }

        // ── Duyệt hoặc hủy booking ────────────────────────────────────────────
        public async Task<(bool Success, string Message)> UpdateStatusAsync(
            int id, AdminBookingUpdateStatusDto dto)
        {
            // Validate status đầu vào
            var status = dto.Status?.Trim().ToLower();
            if (status != "confirmed" && status != "cancelled")
                return (false, "Trạng thái không hợp lệ. Chỉ chấp nhận: confirmed | cancelled");

            // Kiểm tra booking tồn tại
            var booking = await _repo.GetByIdAsync(id);
            if (booking == null)
                return (false, $"Không tìm thấy booking #{id}");

            // Không cho thao tác nếu đã cancelled rồi
            if (booking.Status.ToLower() == "cancelled")
                return (false, "Booking này đã bị hủy, không thể thay đổi trạng thái.");

            // Không cho confirm nếu đã confirmed rồi
            if (status == "confirmed" && booking.Status.ToLower() == "confirmed")
                return (false, "Booking này đã được xác nhận rồi.");

            bool result = status == "confirmed"
                ? await _repo.ConfirmAsync(id)
                : await _repo.CancelAsync(id);

            if (!result)
                return (false, "Cập nhật thất bại, vui lòng thử lại.");

            string action = status == "confirmed" ? "xác nhận" : "hủy";
            return (true, $"Đã {action} booking #{id} thành công.");
        }
    }
}