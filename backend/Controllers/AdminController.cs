using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [Route("api/admin")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        
        [HttpPost("login")]
        public async Task<IActionResult> LoginAdmin([FromBody] LoginAdminDto loginAdminDto)
        {
            if (loginAdminDto.Username != "admin" || loginAdminDto.Password != "admin")
                return Unauthorized("Tên đăng nhập hoặc mật khẩu không chính xác");

            return Ok(true);
        }
    } 
}