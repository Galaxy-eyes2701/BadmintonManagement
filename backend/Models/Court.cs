using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Court
{
    public int Id { get; set; }

    public int BranchId { get; set; }

    public int CourtTypeId { get; set; }

    public string Name { get; set; } = null!;

    public string Status { get; set; } = null!;

    public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();

    public virtual Branch Branch { get; set; } = null!;

    public virtual CourtType CourtType { get; set; } = null!;

    public virtual ICollection<FixedSchedule> FixedSchedules { get; set; } = new List<FixedSchedule>();
}
