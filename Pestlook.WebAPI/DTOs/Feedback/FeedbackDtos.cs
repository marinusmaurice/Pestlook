using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.Feedback;

public sealed record CreateFeedbackRequest(
    FeedbackCategory Category,
    string Subject,
    string Message,
    string? PageUrl);

public sealed record FeedbackResponse(
    Guid Id,
    FeedbackCategory Category,
    string Subject,
    string Message,
    string? PageUrl,
    DateTime CreatedAt,
    string? SubmittedByName)
{
    public FeedbackResponse() : this(default, default, string.Empty, string.Empty, default, default, default) { }
}
