using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Voucher
{
    public int Id { get; set; }

    public string Code { get; set; } = null!;

    public decimal DiscountAmount { get; set; }

    public int UsageLimit { get; set; }

    public DateOnly ExpiryDate { get; set; }
}
