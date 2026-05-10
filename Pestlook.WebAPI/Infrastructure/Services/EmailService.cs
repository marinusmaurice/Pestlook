using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
using Pestlook.WebAPI.Options;

namespace Pestlook.WebAPI.Infrastructure.Services;

public sealed class EmailService(IOptions<EmailOptions> options, ILogger<EmailService> logger) : IEmailService
{
    private readonly EmailOptions _opts = options.Value;

    public Task SendEmailConfirmationAsync(string toEmail, string toName, string confirmationLink, CancellationToken ct = default)
    {
        const string subject = "Confirm your Pestlook account";
        var body = $"""
            <p>Hi {HtmlEncode(toName)},</p>
            <p>Thank you for signing up to <strong>Pestlook</strong>. Please confirm your email address by clicking the button below.</p>
            <p><a href="{confirmationLink}" style="background:#2e7d32;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Confirm Email</a></p>
            <p>If you did not create an account you can safely ignore this email.</p>
            <p>The link expires in 24 hours.</p>
            """;
        return SendAsync(toEmail, toName, subject, body, ct);
    }

    public Task SendPasswordResetAsync(string toEmail, string toName, string resetLink, CancellationToken ct = default)
    {
        const string subject = "Reset your Pestlook password";
        var body = $"""
            <p>Hi {HtmlEncode(toName)},</p>
            <p>We received a request to reset the password for your <strong>Pestlook</strong> account.</p>
            <p><a href="{resetLink}" style="background:#1565c0;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
            <p>If you did not request a password reset you can safely ignore this email.</p>
            <p>The link expires in 1 hour.</p>
            """;
        return SendAsync(toEmail, toName, subject, body, ct);
    }

    public Task SendMemberInviteAsync(string toEmail, string inviterName, string tenantName, string inviteLink, CancellationToken ct = default)
    {
        var subject = $"You have been invited to join {HtmlEncode(tenantName)} on Pestlook";
        var body = $"""
            <p>Hi,</p>
            <p><strong>{HtmlEncode(inviterName)}</strong> has invited you to join <strong>{HtmlEncode(tenantName)}</strong> on <strong>Pestlook</strong>.</p>
            <p>Click the button below to accept the invitation and set your password.</p>
            <p><a href="{inviteLink}" style="background:#6a1b9a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Accept Invitation</a></p>
            <p>This invitation expires in 48 hours.</p>
            """;
        return SendAsync(toEmail, toEmail, subject, body, ct);
    }

    public Task SendBillingNotificationAsync(string toEmail, string toName, string tenantName, int month, int year, int activePoints, decimal amountDollars, CancellationToken ct = default)
    {
        var subject = $"Pestlook billing summary — {new DateTime(year, month, 1):MMMM yyyy}";
        var body = $"""
            <p>Hi {HtmlEncode(toName)},</p>
            <p>Here is your <strong>Pestlook</strong> billing summary for <strong>{new DateTime(year, month, 1):MMMM yyyy}</strong>.</p>
            <table style="border-collapse:collapse;width:320px;">
              <tr><td style="padding:6px;border:1px solid #ccc;">Organisation</td><td style="padding:6px;border:1px solid #ccc;">{HtmlEncode(tenantName)}</td></tr>
              <tr><td style="padding:6px;border:1px solid #ccc;">Active monitoring points</td><td style="padding:6px;border:1px solid #ccc;">{activePoints}</td></tr>
              <tr><td style="padding:6px;border:1px solid #ccc;font-weight:bold;">Total due</td><td style="padding:6px;border:1px solid #ccc;font-weight:bold;">${amountDollars:F2}</td></tr>
            </table>
            <p>If you have any questions please contact our support team.</p>
            """;
        return SendAsync(toEmail, toName, subject, body, ct);
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private async Task SendAsync(string toEmail, string toName, string subject, string htmlBody, CancellationToken ct)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_opts.FromName, _opts.FromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = WrapLayout(subject, htmlBody) }.ToMessageBody();

        try
        {
            using var smtp = new SmtpClient();
            var secureOption = _opts.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable;
            await smtp.ConnectAsync(_opts.SmtpHost, _opts.SmtpPort, secureOption, ct);

            if (!string.IsNullOrWhiteSpace(_opts.Username))
                await smtp.AuthenticateAsync(_opts.Username, _opts.Password, ct);

            await smtp.SendAsync(message, ct);
            await smtp.DisconnectAsync(true, ct);

            logger.LogInformation("Email '{Subject}' sent to {ToEmail}", subject, toEmail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email '{Subject}' to {ToEmail}", subject, toEmail);
            throw;
        }
    }

    private static string WrapLayout(string title, string body) => $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>{HtmlEncode(title)}</title></head>
        <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.1);">
            <div style="margin-bottom:24px;">
              <span style="font-size:22px;font-weight:bold;color:#2e7d32;">🌱 Pestlook</span>
            </div>
            {body}
            <hr style="margin-top:32px;border:none;border-top:1px solid #eee;">
            <p style="font-size:12px;color:#888;">© {DateTime.UtcNow.Year} Pestlook. All rights reserved.</p>
          </div>
        </body>
        </html>
        """;

    private static string HtmlEncode(string value) =>
        System.Net.WebUtility.HtmlEncode(value);
}
