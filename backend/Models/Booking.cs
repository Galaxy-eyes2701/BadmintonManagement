using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Booking
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public decimal? TotalPrice { get; set; }

    public string Status { get; set; } = null!;

    public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual User User { get; set; } = null!;
}
