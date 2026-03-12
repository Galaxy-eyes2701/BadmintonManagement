public class CreateFixedScheduleDto
{
    public int UserId { get; set; }
    public int CourtId { get; set; }
    public int TimeSlotId { get; set; }
    public int DayOfWeek { get; set; } // Thứ mấy (2 -> 8)
    public string StartDate { get; set; }
    public string EndDate { get; set; }
    public decimal TotalPrice { get; set; }
}