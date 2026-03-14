using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using backend.Models;

namespace backend.Interface.Repository
{
    public interface ITimeSlotRepository
    {
        Task<IEnumerable<TimeSlot>> GetAllAsync();
        Task<TimeSlot?> GetByIdAsync(int id);
        Task<TimeSlot> CreateAsync(TimeSlot timeSlot);
        Task UpdateAsync(TimeSlot timeSlot);
        Task DeleteAsync(int id);
    }
}