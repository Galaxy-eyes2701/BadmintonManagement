using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Dtos
{

public class BranchDto
    {
        public string Name { get; set; } = null!;
        public string? Address { get; set; }
        public string? Hotline { get; set; }
    }
}