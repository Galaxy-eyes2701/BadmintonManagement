using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Models;

namespace backend.Interface.Repository
{
    public interface ICourtTypeRepository
    {
        Task<IEnumerable<CourtType>> GetAllAsync();
        Task<CourtType?> GetByIdAsync(int id);
        Task<CourtType> CreateAsync(CourtType courtType);
        Task UpdateAsync(CourtType courtType);
        Task DeleteAsync(int id);
    }
}