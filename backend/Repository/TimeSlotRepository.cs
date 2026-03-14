using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class TimeSlotRepository : ITimeSlotRepository
    {
        private readonly BadmintonManagementContext _context;

        public TimeSlotRepository(BadmintonManagementContext context)
            => _context = context;

        public async Task<IEnumerable<TimeSlot>> GetAllAsync()
            => await _context.TimeSlots
                .OrderBy(t => t.StartTime)
                .ToListAsync();

        public async Task<TimeSlot?> GetByIdAsync(int id)
            => await _context.TimeSlots.FindAsync(id);

        public async Task<TimeSlot> CreateAsync(TimeSlot timeSlot)
        {
            _context.TimeSlots.Add(timeSlot);
            await _context.SaveChangesAsync();
            return timeSlot;
        }

        public async Task UpdateAsync(TimeSlot timeSlot)
        {
            _context.TimeSlots.Update(timeSlot);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var slot = await _context.TimeSlots.FindAsync(id);
            if (slot != null)
            {
                _context.TimeSlots.Remove(slot);
                await _context.SaveChangesAsync();
            }
        }
    }
}