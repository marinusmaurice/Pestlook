using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
using Pestlook.WebAPI.Options;

namespace Pestlook.WebAPI.Infrastructure.Services;

public sealed class EmailService(
    IOptions<EmailOptions> emailOptions,
    ILogger<EmailService> logger) : IEmailService
{
    private readonly EmailOptions _opts = emailOptions.Value;

    public async Task SendActivationEmailAsync(string toEmail, string firstName, string activationUrl, CancellationToken ct = default)
    {
        var subject = "Activate your PestLook account";
        var body = BuildActivationHtml(firstName, activationUrl);

        await SendAsync(toEmail, subject, body, ct);

        logger.LogInformation("Activation email sent to {Email}", toEmail);
    }

    private async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct)
    {
        using var client = new SmtpClient(_opts.Host, _opts.Port)
        {
            EnableSsl = _opts.EnableSsl,
            Credentials = new NetworkCredential(_opts.Username, _opts.Password)
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_opts.FromAddress, _opts.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(toEmail);

        await client.SendMailAsync(message, ct);
    }

    private static string BuildActivationHtml(string firstName, string activationUrl) => $"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Activate your PestLook account</title>
        </head>
        <body style="margin:0;padding:0;background:#F5F5F0;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E2DFD3;">
                  <!-- Header -->
                  <tr>
                    <td style="background:#2B6E4F;padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:1.8rem;font-weight:800;letter-spacing:-0.02em;">
                        Pest<span style="color:#E5A52F;">Look</span>
                      </h1>
                      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:0.9rem;">Field-first pest scouting &amp; monitoring</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <p style="margin:0 0 16px;font-size:1.05rem;color:#1F2A26;">Hi {firstName},</p>
                      <p style="margin:0 0 24px;font-size:0.95rem;color:#5A6B62;line-height:1.6;">
                        Thanks for signing up to PestLook. To start monitoring your farms and fields, please activate your account by clicking the button below.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding:8px 0 32px;">
                            <a href="{activationUrl}"
                               style="display:inline-block;background:#2B6E4F;color:#ffffff;font-weight:700;font-size:1rem;
                                      padding:14px 36px;border-radius:40px;text-decoration:none;letter-spacing:0.01em;">
                              Activate my account
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 12px;font-size:0.85rem;color:#5A6B62;line-height:1.6;">
                        This link expires in <strong>24 hours</strong>. If you didn&rsquo;t create a PestLook account, you can safely ignore this email.
                      </p>
                      <p style="margin:0;font-size:0.8rem;color:#9AA8A1;word-break:break-all;">
                        If the button doesn&rsquo;t work, copy and paste this URL into your browser:<br>
                        <a href="{activationUrl}" style="color:#2B6E4F;">{activationUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#F9F7F0;padding:20px 40px;border-top:1px solid #E2DFD3;text-align:center;">
                      <p style="margin:0;font-size:0.78rem;color:#9AA8A1;">
                        &copy; 2026 PestLook &mdash; Built for farmers, agronomists, and the field.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;
}
