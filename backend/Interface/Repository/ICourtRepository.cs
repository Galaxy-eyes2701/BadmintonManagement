using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Models;

namespace backend.Interface.Repository
{
    public interface ICourtRepository
    {
        Task<IEnumerable<Court>> GetAllAsync();
        Task<Court?> GetByIdAsync(int id);
        Task<Court> CreateAsync(Court court);
        Task UpdateAsync(Court court);
        Task DeleteAsync(int id);
    }
}