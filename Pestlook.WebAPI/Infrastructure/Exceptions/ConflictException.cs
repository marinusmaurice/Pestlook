namespace Pestlook.WebAPI.Infrastructure.Exceptions;

public sealed class ConflictException(string message) : Exception(message);
