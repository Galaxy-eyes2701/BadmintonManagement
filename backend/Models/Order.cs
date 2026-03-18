using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Order
{
    public int Id { get; set; }

    public int? BookingId { get; set; }

    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public virtual Booking? Booking { get; set; }

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
