using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class AdminVoucherRepository : IAdminVoucherRepository
    {
        private readonly BadmintonManagementContext _context;

        public AdminVoucherRepository(BadmintonManagementContext context)
            => _context = context;

        public async Task<IEnumerable<Voucher>> GetAllAsync()
            => await _context.Vouchers
                .OrderByDescending(v => v.Id)
                .ToListAsync();

        public async Task<Voucher?> GetByIdAsync(int id)
            => await _context.Vouchers.FindAsync(id);

        public async Task<Voucher?> GetByCodeAsync(string code)
            => await _context.Vouchers
                .FirstOrDefaultAsync(v => v.Code.ToLower() == code.ToLower());

        public async Task<bool> CodeExistsAsync(string code)
            => await _context.Vouchers
                .AnyAsync(v => v.Code.ToLower() == code.ToLower());

        public async Task<Voucher> CreateAsync(Voucher voucher)
        {
            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();
            return voucher;
        }

        public async Task UpdateAsync(Voucher voucher)
        {
            _context.Vouchers.Update(voucher);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher != null)
            {
                _context.Vouchers.Remove(voucher);
                await _context.SaveChangesAsync();
            }
        }
    }
}