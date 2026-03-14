using backend.Interface.Repository;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repository
{
    public class AdminUserRepository : IAdminUserRepository
    {
        private readonly BadmintonManagementContext _context;
        public AdminUserRepository(BadmintonManagementContext context) => _context = context;

        public async Task<IEnumerable<User>> GetAllUsersAsync()
            => await _context.Users.OrderByDescending(u => u.Id).ToListAsync();

        // So sánh ToLower() cả 2 vế → "staff" = "Staff" = "STAFF"
        public async Task<IEnumerable<User>> GetUsersByRoleAsync(string role)
            => await _context.Users
                .Where(u => u.Role.ToLower() == role.ToLower())
                .OrderByDescending(u => u.Id)
                .ToListAsync();

        public async Task<User?> GetUserByIdAsync(int id)
            => await _context.Users.FindAsync(id);

        public async Task<bool> PhoneExistsAsync(string phone)
            => await _context.Users.AnyAsync(u => u.Phone == phone);

        public async Task<User> CreateUserAsync(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task UpdateUserAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteUserAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user != null)
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
            }
        }
    }
}