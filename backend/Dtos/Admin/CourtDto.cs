using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Dtos
{
    public class CourtDto
    {
        public int BranchId { get; set; }
        public int CourtTypeId { get; set; }
        public string Name { get; set; } = null!;
        public string Status { get; set; } = null!;
    }
}