namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IEmailService
{
    Task SendActivationEmailAsync(string toEmail, string firstName, string activationUrl, CancellationToken ct = default);
}
