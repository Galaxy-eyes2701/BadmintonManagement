using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using System.ComponentModel.DataAnnotations;

namespace backend.Dtos.Admin
{
    // Request: tạo hoặc cập nhật voucher
    public class VoucherUpsertDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = null!;

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "DiscountAmount phải >= 0.")]
        public decimal DiscountAmount { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "UsageLimit phải >= 1.")]
        public int UsageLimit { get; set; }

        [Required]
        public DateOnly ExpiryDate { get; set; }
    }

    // Response trả về client
    public class VoucherResponseDto
    {
        public int     Id             { get; set; }
        public string  Code           { get; set; } = null!;
        public decimal DiscountAmount { get; set; }
        public int     UsageLimit     { get; set; }
        public string  ExpiryDate     { get; set; } = null!;   // "yyyy-MM-dd"
        public bool    IsExpired      { get; set; }
    }
}