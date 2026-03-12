using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class BranchRepository : IBranchRepository
    {
        private readonly BadmintonManagementContext _context;
        public BranchRepository(BadmintonManagementContext context) => _context = context;

        public async Task<IEnumerable<Branch>> GetAllAsync() => await _context.Branches.ToListAsync();
        
        public async Task<Branch?> GetByIdAsync(int id) => await _context.Branches.FindAsync(id);

        public async Task<Branch> CreateAsync(Branch branch)
        {
            _context.Branches.Add(branch);
            await _context.SaveChangesAsync();
            return branch;
        }

        public async Task UpdateAsync(Branch branch)
        {
            _context.Branches.Update(branch);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var branch = await _context.Branches.FindAsync(id);
            if (branch != null)
            {
                _context.Branches.Remove(branch);
                await _context.SaveChangesAsync();
            }
        }
    }
}