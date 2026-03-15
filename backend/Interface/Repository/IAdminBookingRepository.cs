using System.Collections.Generic;
using System.Threading.Tasks;
using backend.Dtos.Admin;

namespace backend.Interface.Repository
{
    public interface IAdminBookingRepository
    {
        /// <summary>Lấy danh sách booking có filter + phân trang</summary>
        Task<AdminBookingPagedDto> GetAllAsync(AdminBookingFilterDto filter);

        /// <summary>Lấy chi tiết 1 booking theo ID</summary>
        Task<AdminBookingDetailDto?> GetByIdAsync(int id);

        /// <summary>Duyệt booking (pending → confirmed)</summary>
        Task<bool> ConfirmAsync(int id);

        /// <summary>Hủy booking bất kỳ trạng thái</summary>
        Task<bool> CancelAsync(int id);
    }
}