using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Dtos
{
    public class CourtTypeDto
    {
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }
}