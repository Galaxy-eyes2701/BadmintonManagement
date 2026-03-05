using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class PriceConfig
{
    public int Id { get; set; }

    public int CourtTypeId { get; set; }

    public int TimeSlotId { get; set; }

    public int DayOfWeek { get; set; }

    public decimal Price { get; set; }

    public virtual CourtType CourtType { get; set; } = null!;

    public virtual TimeSlot TimeSlot { get; set; } = null!;
}
