using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using backend.Models;

namespace backend.Interface.Repository
{
    public interface IPriceConfigRepository
    {
        /// Lấy toàn bộ cấu hình giá (có include CourtType + TimeSlot)
        Task<IEnumerable<PriceConfig>> GetAllAsync();

        /// Lấy theo loại sân
        Task<IEnumerable<PriceConfig>> GetByCourtTypeAsync(int courtTypeId);

        /// Lấy 1 bản ghi theo id
        Task<PriceConfig?> GetByIdAsync(int id);

        /// Lấy theo bộ ba khoá duy nhất (CourtTypeId, TimeSlotId, DayOfWeek)
        Task<PriceConfig?> GetByUniqueKeyAsync(int courtTypeId, int timeSlotId, int dayOfWeek);

        /// Tạo mới
        Task<PriceConfig> CreateAsync(PriceConfig config);

        /// Cập nhật
        Task UpdateAsync(PriceConfig config);

        /// Xoá theo id
        Task DeleteAsync(int id);

        /// Upsert hàng loạt (insert nếu chưa có, update nếu đã có)
        Task BulkUpsertAsync(IEnumerable<PriceConfig> configs);
    }
}