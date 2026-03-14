using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class PriceConfigRepository : IPriceConfigRepository
    {
        private readonly BadmintonManagementContext _context;

        public PriceConfigRepository(BadmintonManagementContext context)
            => _context = context;

        public async Task<IEnumerable<PriceConfig>> GetAllAsync()
            => await _context.PriceConfigs
                .Include(p => p.CourtType)
                .Include(p => p.TimeSlot)
                .OrderBy(p => p.CourtTypeId)
                .ThenBy(p => p.DayOfWeek)
                .ThenBy(p => p.TimeSlot.StartTime)
                .ToListAsync();

        public async Task<IEnumerable<PriceConfig>> GetByCourtTypeAsync(int courtTypeId)
            => await _context.PriceConfigs
                .Include(p => p.CourtType)
                .Include(p => p.TimeSlot)
                .Where(p => p.CourtTypeId == courtTypeId)
                .OrderBy(p => p.DayOfWeek)
                .ThenBy(p => p.TimeSlot.StartTime)
                .ToListAsync();

        public async Task<PriceConfig?> GetByIdAsync(int id)
            => await _context.PriceConfigs
                .Include(p => p.CourtType)
                .Include(p => p.TimeSlot)
                .FirstOrDefaultAsync(p => p.Id == id);

        public async Task<PriceConfig?> GetByUniqueKeyAsync(int courtTypeId, int timeSlotId, int dayOfWeek)
            => await _context.PriceConfigs
                .FirstOrDefaultAsync(p =>
                    p.CourtTypeId == courtTypeId &&
                    p.TimeSlotId  == timeSlotId  &&
                    p.DayOfWeek   == dayOfWeek);

        public async Task<PriceConfig> CreateAsync(PriceConfig config)
        {
            _context.PriceConfigs.Add(config);
            await _context.SaveChangesAsync();
            return config;
        }

        public async Task UpdateAsync(PriceConfig config)
        {
            _context.PriceConfigs.Update(config);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var config = await _context.PriceConfigs.FindAsync(id);
            if (config != null)
            {
                _context.PriceConfigs.Remove(config);
                await _context.SaveChangesAsync();
            }
        }

        public async Task BulkUpsertAsync(IEnumerable<PriceConfig> configs)
        {
            foreach (var item in configs)
            {
                var existing = await GetByUniqueKeyAsync(
                    item.CourtTypeId, item.TimeSlotId, item.DayOfWeek);

                if (existing == null)
                    _context.PriceConfigs.Add(item);
                else
                {
                    existing.Price = item.Price;
                    _context.PriceConfigs.Update(existing);
                }
            }
            await _context.SaveChangesAsync();
        }
    }
}