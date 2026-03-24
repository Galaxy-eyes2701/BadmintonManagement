using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SeedController : ControllerBase
    {
        private readonly BadmintonManagementContext _context;
        private readonly IPasswordService _passwordService;

        public SeedController(BadmintonManagementContext context, IPasswordService passwordService)
        {
            _context = context;
            _passwordService = passwordService;
        }

        // GET api/seed/full
        // Seed toàn bộ: 3 chi nhánh, 3 sân/chi nhánh, timeslots, users, bookings mỗi ngày
        [HttpGet("full")]
        public async Task<IActionResult> SeedFull()
        {
            try
            {
                var pw = _passwordService.HashPassword("123456");
                var today = DateOnly.FromDateTime(DateTime.Now);

                // ══════════════════════════════════════════
                // 1. TIME SLOTS (6 ca / ngày)
                // ══════════════════════════════════════════
                if (!await _context.TimeSlots.AnyAsync())
                {
                    _context.TimeSlots.AddRange(
                        new TimeSlot { StartTime = new TimeOnly(6, 0), EndTime = new TimeOnly(7, 30) },
                        new TimeSlot { StartTime = new TimeOnly(7, 30), EndTime = new TimeOnly(9, 0) },
                        new TimeSlot { StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(10, 30) },
                        new TimeSlot { StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(15, 30) },
                        new TimeSlot { StartTime = new TimeOnly(17, 0), EndTime = new TimeOnly(18, 30) },
                        new TimeSlot { StartTime = new TimeOnly(19, 0), EndTime = new TimeOnly(20, 30) }
                    );
                    await _context.SaveChangesAsync();
                }
                var slots = await _context.TimeSlots.OrderBy(t => t.StartTime).ToListAsync();

                // ══════════════════════════════════════════
                // 2. COURT TYPES
                // ══════════════════════════════════════════
                if (!await _context.CourtTypes.AnyAsync())
                {
                    _context.CourtTypes.AddRange(
                        new CourtType { Name = "Sân tiêu chuẩn" },
                        new CourtType { Name = "Sân VIP" }
                    );
                    await _context.SaveChangesAsync();
                }
                var courtTypes = await _context.CourtTypes.ToListAsync();
                var stdType = courtTypes.First();
                var vipType = courtTypes.Last();

                // ══════════════════════════════════════════
                // 3. PRICE CONFIGS (mọi ngày trong tuần)
                // ══════════════════════════════════════════
                if (!await _context.PriceConfigs.AnyAsync())
                {
                    var priceRows = new List<PriceConfig>();
                    // dow 2-8 (T2→CN theo kiểu VN), slot × courtType × ngày
                    foreach (var slot in slots)
                    {
                        for (int dow = 2; dow <= 8; dow++)
                        {
                            bool isPeak = (slot.StartTime.Hour >= 17); // giờ vàng buổi tối
                            bool isWeekend = (dow >= 7);

                            priceRows.Add(new PriceConfig
                            {
                                CourtTypeId = stdType.Id,
                                TimeSlotId = slot.Id,
                                DayOfWeek = dow,
                                Price = isPeak ? (isWeekend ? 100000 : 80000) : 60000
                            });
                            priceRows.Add(new PriceConfig
                            {
                                CourtTypeId = vipType.Id,
                                TimeSlotId = slot.Id,
                                DayOfWeek = dow,
                                Price = isPeak ? (isWeekend ? 150000 : 120000) : 90000
                            });
                        }
                    }
                    _context.PriceConfigs.AddRange(priceRows);
                    await _context.SaveChangesAsync();
                }

                // ══════════════════════════════════════════
                // 4. BRANCHES + COURTS (3 × 3)
                // ══════════════════════════════════════════
                var branchDefs = new[]
                {
                    new { Name = "FPT Hòa Lạc",  Address = "Khu CNC Hòa Lạc, Thạch Thất, Hà Nội" },
                    new { Name = "FPT Cầu Giấy",  Address = "Dịch Vọng Hậu, Cầu Giấy, Hà Nội"     },
                    new { Name = "FPT Bình Dương", Address = "Thành phố mới Bình Dương"             }
                };

                var branches = new List<Branch>();
                foreach (var bd in branchDefs)
                {
                    var existing = await _context.Branches.FirstOrDefaultAsync(b => b.Name == bd.Name);
                    if (existing == null)
                    {
                        existing = new Branch { Name = bd.Name, Address = bd.Address };
                        _context.Branches.Add(existing);
                        await _context.SaveChangesAsync();
                    }
                    branches.Add(existing);
                }

                // Tạo 3 sân cho mỗi chi nhánh
                var allCourts = new List<Court>();
                foreach (var branch in branches)
                {
                    for (int i = 1; i <= 3; i++)
                    {
                        var courtName = $"Sân {i}";
                        var existing = await _context.Courts
                            .FirstOrDefaultAsync(c => c.BranchId == branch.Id && c.Name == courtName);
                        if (existing == null)
                        {
                            existing = new Court
                            {
                                Name = courtName,
                                BranchId = branch.Id,
                                CourtTypeId = (i == 3) ? vipType.Id : stdType.Id, // sân 3 là VIP
                                Status = "available"
                            };
                            _context.Courts.Add(existing);
                            await _context.SaveChangesAsync();
                        }
                        allCourts.Add(existing);
                    }
                }

                // ══════════════════════════════════════════
                // 5. STAFF (1 per branch) + CUSTOMERS (10 người)
                // ══════════════════════════════════════════
                var staffDefs = new[]
                {
                    new { Phone = "0901000001", Name = "Lễ tân Hòa Lạc",  BranchId = branches[0].Id },
                    new { Phone = "0901000002", Name = "Lễ tân Cầu Giấy",  BranchId = branches[1].Id },
                    new { Phone = "0901000003", Name = "Lễ tân Bình Dương", BranchId = branches[2].Id }
                };
                foreach (var s in staffDefs)
                {
                    var u = await _context.Users.FirstOrDefaultAsync(x => x.Phone == s.Phone);
                    if (u == null)
                        _context.Users.Add(new User
                        {
                            FullName = s.Name,
                            Phone = s.Phone,
                            Email = $"{s.Phone}@fpt.edu.vn",
                            PasswordHash = pw,
                            Role = "Staff",
                            BranchId = s.BranchId,
                            LoyaltyPoints = 0
                        });
                    else { u.BranchId = s.BranchId; u.PasswordHash = pw; }
                }

                var customerNames = new[]
                {
                    ("0909100001","Nguyễn Văn An"),   ("0909100002","Trần Thị Bích"),
                    ("0909100003","Lê Hoàng Nam"),    ("0909100004","Phạm Minh Tuấn"),
                    ("0909100005","Hoàng Thu Hà"),    ("0909100006","Vũ Đức Mạnh"),
                    ("0909100007","Đặng Thùy Linh"),  ("0909100008","Bùi Quốc Hùng"),
                    ("0909100009","Ngô Thanh Tâm"),   ("0909100010","Đinh Thị Mai")
                };
                var customers = new List<User>();
                foreach (var (phone, name) in customerNames)
                {
                    var u = await _context.Users.FirstOrDefaultAsync(x => x.Phone == phone);
                    if (u == null)
                    {
                        u = new User
                        {
                            FullName = name,
                            Phone = phone,
                            Email = $"{phone}@gmail.com",
                            PasswordHash = pw,
                            Role = "Customer",
                            LoyaltyPoints = new Random().Next(0, 200)
                        };
                        _context.Users.Add(u);
                        await _context.SaveChangesAsync();
                    }
                    customers.Add(u);
                }
                await _context.SaveChangesAsync();

                // ══════════════════════════════════════════
                // 6. BOOKINGS — 7 ngày qua + 7 ngày tới
                //    Mỗi sân, mỗi ngày: 2-3 ca có người đặt
                // ══════════════════════════════════════════
                var rng = new Random(42);
                int bookingCount = 0;

                for (int dayOffset = -7; dayOffset <= 7; dayOffset++)
                {
                    var playDate = today.AddDays(dayOffset);

                    foreach (var court in allCourts)
                    {
                        // Chọn ngẫu nhiên 3 trong 6 slots để có người đặt
                        var pickedSlots = slots.OrderBy(_ => rng.Next()).Take(3).ToList();

                        foreach (var slot in pickedSlots)
                        {
                            // Kiểm tra đã có booking chưa
                            bool alreadyBooked = await _context.BookingDetails.AnyAsync(bd =>
                                bd.CourtId == court.Id &&
                                bd.TimeSlotId == slot.Id &&
                                bd.PlayDate == playDate &&
                                bd.Booking.Status != "cancelled");
                            if (alreadyBooked) continue;

                            var customer = customers[rng.Next(customers.Count)];
                            int csharpDow = (int)playDate.DayOfWeek;
                            int vnDow = csharpDow == 0 ? 8 : csharpDow + 1;

                            var price = await _context.PriceConfigs
                                .Where(p => p.CourtTypeId == court.CourtTypeId
                                         && p.TimeSlotId == slot.Id
                                         && p.DayOfWeek == vnDow)
                                .Select(p => p.Price)
                                .FirstOrDefaultAsync();
                            if (price == 0) price = 60000;

                            // Ngày trong quá khứ → completed, tương lai → confirmed
                            var status = dayOffset < 0 ? "completed" : "confirmed";

                            var booking = new Booking
                            {
                                UserId = customer.Id,
                                TotalPrice = price,
                                Status = status,
                                CreatedAt = DateTime.Now.AddDays(dayOffset - 1)
                            };
                            _context.Bookings.Add(booking);
                            await _context.SaveChangesAsync();

                            System.Diagnostics.Debug.WriteLine($"[Seed] Created booking {booking.Id} for user {customer.Id} ({customer.FullName}), Status: {status}, Price: {price}");

                            _context.BookingDetails.Add(new BookingDetail
                            {
                                BookingId = booking.Id,
                                CourtId = court.Id,
                                TimeSlotId = slot.Id,
                                PlayDate = playDate,
                                PriceSnapshot = price
                            });

                            // Nếu đã completed → thêm payment
                            if (status == "completed")
                            {
                                _context.Payments.Add(new Payment
                                {
                                    BookingId = booking.Id,
                                    Amount = price,
                                    PaymentMethod = rng.Next(2) == 0 ? "Tiền mặt" : "Chuyển khoản",
                                    Status = "success",
                                    CreatedAt = DateTime.Now.AddDays(dayOffset)
                                });
                            }

                            await _context.SaveChangesAsync();
                            bookingCount++;
                        }
                    }
                }

                // ══════════════════════════════════════════
                // 7. VOUCHERS
                // ══════════════════════════════════════════
                var voucherDefs = new[]
                {
                    new { Code = "FPT50K",   Discount = 50000m,  Limit = 20 },
                    new { Code = "FPT100K",  Discount = 100000m, Limit = 10 },
                    new { Code = "NEWMEMBER",Discount = 30000m,  Limit = 50 }
                };
                foreach (var vd in voucherDefs)
                {
                    if (!await _context.Vouchers.AnyAsync(v => v.Code == vd.Code))
                        _context.Vouchers.Add(new Voucher
                        {
                            Code = vd.Code,
                            DiscountAmount = vd.Discount,
                            UsageLimit = vd.Limit,
                            ExpiryDate = DateOnly.FromDateTime(DateTime.Now.AddYears(1))
                        });
                }
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "✅ Seed thành công!",
                    branches = branches.Select(b => b.Name),
                    courts = allCourts.Count,
                    bookings = bookingCount,
                    accounts = new
                    {
                        staff = new[]
                        {
                            "0901000001 / 123456 → Hòa Lạc",
                            "0901000002 / 123456 → Cầu Giấy",
                            "0901000003 / 123456 → Bình Dương"
                        },
                        customers = customerNames.Select(c => $"{c.Item1} / 123456"),
                        vouchers = voucherDefs.Select(v => v.Code)
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        // GET api/seed/clear — xóa sạch để seed lại từ đầu (cẩn thận!)
        [HttpGet("clear")]
        public async Task<IActionResult> ClearData()
        {
            // Phải xóa theo thứ tự: con trước, cha sau (tránh FK constraint)
            // Dùng ExecuteSqlRaw để tắt FK check tạm thời
            await _context.Database.ExecuteSqlRawAsync("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'");

            try
            {
                // Xóa theo thứ tự an toàn
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM OrderDetails");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM Orders");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM Payments");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM BookingDetails");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM Bookings");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM FixedSchedules");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM PriceConfigs");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM Courts");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM Branches");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM CourtTypes");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM TimeSlots");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM Vouchers");
                await _context.Database.ExecuteSqlRawAsync("DELETE FROM Users WHERE Role IN ('Staff','Customer')");
            }
            finally
            {
                // Bật lại FK
                await _context.Database.ExecuteSqlRawAsync("EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'");
            }

            return Ok(new { message = "🗑️ Đã xóa sạch data test. Gọi /api/seed/full để seed lại." });
        }
    }
}