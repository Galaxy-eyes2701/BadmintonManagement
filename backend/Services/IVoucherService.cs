// IVoucherService.cs
using backend.DTOs;

namespace backend.Services
{
    public interface IVoucherService
    {
        Task<VoucherResultDto> ValidateVoucherAsync(string code);
        Task<bool> UseVoucherAsync(string code); // Gọi hàm này khi đã thanh toán thành công để trừ đi 1 lượt dùng
    }
}