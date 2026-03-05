using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class TimeSlot
{
    public int Id { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();

    public virtual ICollection<FixedSchedule> FixedSchedules { get; set; } = new List<FixedSchedule>();

    public virtual ICollection<PriceConfig> PriceConfigs { get; set; } = new List<PriceConfig>();
}
