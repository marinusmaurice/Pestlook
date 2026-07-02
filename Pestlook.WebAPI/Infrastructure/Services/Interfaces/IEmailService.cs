namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IEmailService
{
    Task SendActivationEmailAsync(string toEmail, string firstName, string activationUrl, CancellationToken ct = default);
    Task SendPasswordResetEmailAsync(string toEmail, string firstName, string resetUrl, CancellationToken ct = default);

    /// <summary>Sends a feedback submission to the admin address, from/cc the submitting user so a reply-all reaches them.</summary>
    Task SendFeedbackEmailAsync(string userEmail, string userName, string category, string subject, string message, CancellationToken ct = default);

    /// <summary>Sends a plain admin alert (migration events, system errors, etc.).</summary>
    Task SendAdminAlertAsync(string subject, string htmlBody, CancellationToken ct = default);
}
