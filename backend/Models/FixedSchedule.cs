using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
namespace backend.Models;

public partial class FixedSchedule
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int CourtId { get; set; }

    public int TimeSlotId { get; set; }

    public int DayOfWeek { get; set; }
    [Column("status")]
    public string? Status { get; set; }

    [Column("total_price", TypeName = "decimal(18, 2)")]
    public decimal? TotalPrice { get; set; }
    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public virtual Court Court { get; set; } = null!;

    public virtual TimeSlot TimeSlot { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
