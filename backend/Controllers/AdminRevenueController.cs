using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Dtos.Admin;
using backend.DTOs;
using backend.Interface.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/admin/revenue")]

    public class AdminRevenueController : ControllerBase
    {
        private readonly IAdminRevenueService _service;

        public AdminRevenueController(IAdminRevenueService service) => _service = service;

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/revenue/summary
        // Query: startDate, endDate
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] RevenueFilterDto filter)
        {
            var result = await _service.GetSummaryAsync(filter);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/revenue/by-branch
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("by-branch")]
        public async Task<IActionResult> GetByBranch([FromQuery] RevenueFilterDto filter)
        {
            var result = await _service.GetRevenueByBranchAsync(filter);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/revenue/by-court-type
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("by-court-type")]
        public async Task<IActionResult> GetByCourtType([FromQuery] RevenueFilterDto filter)
        {
            var result = await _service.GetRevenueByCourtTypeAsync(filter);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/revenue/by-period
        // Query: startDate, endDate, period (day|month|year), branchId
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("by-period")]
        public async Task<IActionResult> GetByPeriod([FromQuery] RevenueFilterDto filter)
        {
            var result = await _service.GetRevenueByPeriodAsync(filter);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/revenue/top-courts?top=10
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("top-courts")]
        public async Task<IActionResult> GetTopCourts(
            [FromQuery] RevenueFilterDto filter,
            [FromQuery] int top = 10)
        {
            if (top <= 0 || top > 50)
                return BadRequest("top phải trong khoảng 1–50.");

            var result = await _service.GetTopCourtsAsync(filter, top);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/revenue/booking-stats
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("booking-stats")]
        public async Task<IActionResult> GetBookingStats([FromQuery] RevenueFilterDto filter)
        {
            var result = await _service.GetBookingStatsAsync(filter);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/revenue/orders
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders([FromQuery] RevenueFilterDto filter)
        {
            var result = await _service.GetOrderRevenueAsync(filter);
            return Ok(result);
        }

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/admin/revenue/export
        // Query: startDate, endDate, period → file CSV
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet("export")]
        public async Task<IActionResult> Export([FromQuery] RevenueFilterDto filter)
        {
            var csvBytes = await _service.ExportCsvAsync(filter);
            var fileName = $"revenue_{DateTime.Now:yyyyMMdd_HHmm}.csv";
            return File(csvBytes, "text/csv; charset=utf-8", fileName);
        }
    }
}