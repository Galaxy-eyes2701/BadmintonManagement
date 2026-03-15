using System.Threading.Tasks;
using backend.Dtos.Admin;

namespace backend.Interface.Service
{
    public interface IAdminBookingService
    {
        Task<AdminBookingPagedDto> GetAllAsync(AdminBookingFilterDto filter);
        Task<AdminBookingDetailDto?> GetByIdAsync(int id);
        Task<(bool Success, string Message)> UpdateStatusAsync(int id, AdminBookingUpdateStatusDto dto);
    }
}