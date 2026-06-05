using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/quota")]
[Authorize]
public sealed class QuotaController(
    IQuotaService quotaService,
    ITenantContext tenantContext) : ControllerBase
{
    [HttpGet("status")]
    [ProducesResponseType(typeof(ApiResponse<QuotaStatus>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var status = await quotaService.GetCurrentMonthStatusAsync(tenantContext.TenantId.Value, ct);
        return Ok(ApiResponse<QuotaStatus>.Ok(status));
    }
}
