using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Branch
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Address { get; set; }

    public string? Hotline { get; set; }

    public virtual ICollection<Court> Courts { get; set; } = new List<Court>();
}
