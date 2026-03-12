using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Dtos.Admin
{
    // POST /api/admin/users — tạo Staff
    public class CreateStaffDto
    {
        public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string? Email { get; set; }
        public string Password { get; set; } = null!;   
    }

    // Response chung cho mọi endpoint
    public class AdminUserResponseDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string? Email { get; set; }
        public string Role { get; set; } = null!;
        public string Status { get; set; } = null!;
        public int? LoyaltyPoints { get; set; }
    }

    public class UpdateCustomerDto
    {
        public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string? Email { get; set; }
        public int? LoyaltyPoints { get; set; }
    }
    
}