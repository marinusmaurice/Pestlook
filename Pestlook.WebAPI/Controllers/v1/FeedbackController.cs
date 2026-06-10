using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Feedback;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/feedback")]
[Authorize]
public sealed class FeedbackController(
    ApplicationDbContext db,
    IMapper mapper,
    ITenantContext tenant,
    ICurrentUserService currentUser,
    IEmailService emailService,
    ILogger<FeedbackController> logger) : ControllerBase
{
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FeedbackResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var feedback = await db.Feedbacks
            .Include(f => f.CreatedBy)
            .FirstOrDefaultAsync(f => f.Id == id, ct);
        if (feedback is null) return NotFound(ApiResponse<object>.Fail("Feedback not found."));
        if (!User.IsInRole("Admin") && feedback.CreatedByUserId != currentUser.UserId)
            return NotFound(ApiResponse<object>.Fail("Feedback not found."));

        return Ok(ApiResponse<FeedbackResponse>.Ok(mapper.Map<FeedbackResponse>(feedback)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<FeedbackResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateFeedbackRequest request, CancellationToken ct)
    {
        var tenantId = tenant.TenantId ?? currentUser.TenantId;
        if (tenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant could not be resolved."));

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, ct);
        if (user?.Email is null)
            return BadRequest(ApiResponse<object>.Fail("User email could not be resolved."));

        var feedback = new Feedback
        {
            TenantId = tenantId.Value,
            Category = request.Category,
            Subject  = request.Subject.Trim(),
            Message  = request.Message.Trim(),
            PageUrl  = request.PageUrl
        };
        db.Feedbacks.Add(feedback);
        await db.SaveChangesAsync(ct);

        var emailSent = true;
        try
        {
            await emailService.SendFeedbackEmailAsync(
                user.Email,
                $"{user.FirstName} {user.LastName}".Trim(),
                feedback.Category.ToString(),
                feedback.Subject,
                feedback.Message,
                ct);
        }
        catch (Exception ex)
        {
            emailSent = false;
            logger.LogError(ex, "Failed to send feedback email for feedback {FeedbackId}", feedback.Id);
        }

        return CreatedAtAction(nameof(GetById), new { id = feedback.Id },
            ApiResponse<FeedbackResponse>.Ok(mapper.Map<FeedbackResponse>(feedback),
                emailSent
                    ? "Feedback submitted. Thank you!"
                    : "Feedback was saved, but the notification email could not be sent."));
    }
}
