using System.Collections.Concurrent;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.Tests.Helpers;

/// <summary>One email the fake would have sent, kept for tests that need to assert on it (e.g. pull an activation link out of the body).</summary>
public sealed record SentEmail(string To, string Subject, string HtmlBody);

/// <summary>
/// Drop-in replacement for <see cref="IEmailService"/> in integration tests — never calls
/// Resend, never spends real API quota. Registered in <see cref="Integration.Infrastructure.TestWebApplicationFactory"/>.
/// Records every call so a test can inspect what "would have" been sent.
/// </summary>
public sealed class FakeEmailService : IEmailService
{
    private readonly ConcurrentBag<SentEmail> _sent = [];

    public IReadOnlyCollection<SentEmail> SentEmails => _sent;

    public Task SendActivationEmailAsync(string toEmail, string firstName, string activationUrl, CancellationToken ct = default)
    {
        _sent.Add(new SentEmail(toEmail, "Activate your PestLook account", activationUrl));
        return Task.CompletedTask;
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string firstName, string resetUrl, CancellationToken ct = default)
    {
        _sent.Add(new SentEmail(toEmail, "Reset your PestLook password", resetUrl));
        return Task.CompletedTask;
    }

    public Task SendFeedbackEmailAsync(string userEmail, string userName, string category, string subject, string message, CancellationToken ct = default)
    {
        _sent.Add(new SentEmail(userEmail, $"[PestLook Feedback] [{category}] {subject}", message));
        return Task.CompletedTask;
    }

    public Task SendAdminAlertAsync(string subject, string htmlBody, CancellationToken ct = default)
    {
        _sent.Add(new SentEmail("admin", subject, htmlBody));
        return Task.CompletedTask;
    }
}
