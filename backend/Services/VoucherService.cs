// VoucherService.cs
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class VoucherService : IVoucherService
    {
        private readonly BadmintonManagementContext _context;

        public VoucherService(BadmintonManagementContext context)
        {
            _context = context;
        }

        public async Task<VoucherResultDto> ValidateVoucherAsync(string code)
        {
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == code);

            if (voucher == null)
                return new VoucherResultDto { IsValid = false, Message = "Mã giảm giá không tồn tại." };

            if (voucher.ExpiryDate < DateOnly.FromDateTime(DateTime.Now))
            {
                throw new Exception("Voucher đã hết hạn");
            }

            if (voucher.UsageLimit <= 0)
                return new VoucherResultDto { IsValid = false, Message = "Mã giảm giá đã hết lượt sử dụng." };

            return new VoucherResultDto
            {
                IsValid = true,
                DiscountAmount = voucher.DiscountAmount,
                Message = "Áp dụng mã thành công!"
            };
        }

        // Hàm này sẽ được gọi ở Module Payment (Khi khách đã quẹt thẻ xong)
        public async Task<bool> UseVoucherAsync(string code)
        {
            var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code == code);
            if (voucher != null && voucher.UsageLimit > 0)
            {
                voucher.UsageLimit -= 1; // Trừ đi 1 lượt
                _context.Vouchers.Update(voucher);
                await _context.SaveChangesAsync();
                return true;
            }
            return false;
        }
    }
}