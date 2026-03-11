using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class CourtTypeRepository : ICourtTypeRepository
    {
        private readonly BadmintonManagementContext _context;
        public CourtTypeRepository(BadmintonManagementContext context) => _context = context;

        public async Task<IEnumerable<CourtType>> GetAllAsync() => await _context.CourtTypes.ToListAsync();
        public async Task<CourtType?> GetByIdAsync(int id) => await _context.CourtTypes.FindAsync(id);
        public async Task<CourtType> CreateAsync(CourtType courtType) 
        {   
            _context.CourtTypes.Add(courtType); 
            await _context.SaveChangesAsync(); return courtType; 
        }
        public async Task UpdateAsync(CourtType courtType) 
        { 
            _context.CourtTypes.Update(courtType); 
            await _context.SaveChangesAsync(); 
        }
        public async Task DeleteAsync(int id) 
        { 
            var ct = await _context.CourtTypes.FindAsync(id); 
            if (ct != null) 
            {   
                _context.CourtTypes.Remove(ct); 
                await _context.SaveChangesAsync(); 
            } 
        }
    }
}