using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class BookingDetail
{
    public int Id { get; set; }

    public int BookingId { get; set; }

    public int CourtId { get; set; }

    public int TimeSlotId { get; set; }

    public DateOnly PlayDate { get; set; }

    public decimal PriceSnapshot { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual Court Court { get; set; } = null!;

    public virtual TimeSlot TimeSlot { get; set; } = null!;
}
