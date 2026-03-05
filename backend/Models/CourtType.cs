using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class CourtType
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<Court> Courts { get; set; } = new List<Court>();

    public virtual ICollection<PriceConfig> PriceConfigs { get; set; } = new List<PriceConfig>();
}
