using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Models;

namespace backend.Interface.Repository
{
    public interface IBranchRepository
    {
        Task<IEnumerable<Branch>> GetAllAsync();
        Task<Branch?> GetByIdAsync(int id);
        Task<Branch> CreateAsync(Branch branch);
        Task UpdateAsync(Branch branch);
        Task DeleteAsync(int id);
    }
}