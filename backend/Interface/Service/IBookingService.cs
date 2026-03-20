using backend.DTOs;

namespace backend.Interface.Service
{
    public interface IBookingService
    {
        Task<List<AvailableCourtDto>> GetAvailableCourtsAsync(DateTime date, int? branchId, int? courtTypeId);
        Task<BookingResponseDto> CreateBookingAsync(int userId, CreateBookingDto dto);
        Task<bool> CancelBookingAsync(int bookingId, int userId);
        Task<List<BookingHistoryDto>> GetUserBookingsAsync(int userId);
        Task<BookingDetailResponseDto?> GetBookingByIdAsync(int bookingId, int userId);
        Task<UserProfileDto> GetUserProfileAsync(int userId);
        Task<VoucherValidationDto> ValidateVoucherAsync(string code, decimal totalAmount);
        Task<List<UserOrderDto>> GetUserOrdersAsync(int userId);

        // Purchase products with booking
        Task<OrderWithBookingResponseDto> CreateOrderWithBookingAsync(int userId, CreateOrderWithBookingDto dto);
        Task<List<AvailableProductDto>> GetAvailableProductsAsync();
        Task<List<BookingHistoryDto>> GetActiveBookingsForPurchaseAsync(int userId);
    }
}