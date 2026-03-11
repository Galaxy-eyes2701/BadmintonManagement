using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class CourtRepository : ICourtRepository
    {
        private readonly BadmintonManagementContext _context;
        public CourtRepository(BadmintonManagementContext context) => _context = context;

        public async Task<IEnumerable<Court>> GetAllAsync()
        {
            // Include Branch và CourtType để lấy tên thay vì chỉ ID
            return await _context.Courts
                .Include(c => c.Branch)
                .Include(c => c.CourtType)
                .ToListAsync();
        }

        public async Task<Court?> GetByIdAsync(int id)
        {
            return await _context.Courts
                .Include(c => c.Branch)
                .Include(c => c.CourtType)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<Court> CreateAsync(Court court) 
        { 
            _context.Courts.Add(court); 
            await _context.SaveChangesAsync(); return court; 
        }
        public async Task UpdateAsync(Court court) 
        { 
            _context.Courts.Update(court);
             await _context.SaveChangesAsync(); 
        }
        public async Task DeleteAsync(int id) 
        { 
            var court = await _context.Courts.FindAsync(id); 
            if (court != null) 
            { 
                _context.Courts.Remove(court); 
                await _context.SaveChangesAsync();
            } 
        }
    }
}