namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IEmailService
{
    Task SendEmailConfirmationAsync(string toEmail, string toName, string confirmationLink, CancellationToken ct = default);
    Task SendPasswordResetAsync(string toEmail, string toName, string resetLink, CancellationToken ct = default);
    Task SendMemberInviteAsync(string toEmail, string inviterName, string tenantName, string inviteLink, CancellationToken ct = default);
    Task SendBillingNotificationAsync(string toEmail, string toName, string tenantName, int month, int year, int activePoints, decimal amountDollars, CancellationToken ct = default);
}
