using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Dtos.Admin
{
    // Request: tạo hoặc cập nhật 1 giá
    public class PriceConfigUpsertDto
    {
        public int CourtTypeId { get; set; }
        public int TimeSlotId  { get; set; }

        /// <summary>0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7 (theo .NET DayOfWeek)</summary>
        public int DayOfWeek   { get; set; }

        public decimal Price   { get; set; }
    }

    // Request: upsert nhiều giá 1 lúc (tiện cho UI bảng giá)
    public class BulkPriceConfigDto
    {
        public List<PriceConfigUpsertDto> Items { get; set; } = new();
    }

    // Response trả về client
    public class PriceConfigResponseDto
    {
        public int     Id           { get; set; }
        public int     CourtTypeId  { get; set; }
        public string  CourtTypeName{ get; set; } = null!;
        public int     TimeSlotId   { get; set; }
        public string  TimeSlotLabel{ get; set; } = null!;   // "07:00 - 08:00"
        public int     DayOfWeek    { get; set; }
        public string  DayLabel     { get; set; } = null!;   // "Thứ 2"
        public decimal Price        { get; set; }
    }
}