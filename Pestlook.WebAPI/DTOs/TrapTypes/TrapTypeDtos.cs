namespace Pestlook.WebAPI.DTOs.TrapTypes;

public sealed record CreateTrapTypeRequest(string Name, string? Description);

public sealed record UpdateTrapTypeRequest(string Name, string? Description);

public sealed record TrapTypeResponse(Guid Id, string Name, string? Description, DateTime CreatedAt, DateTime? UpdatedAt)
{
    public TrapTypeResponse() : this(default, string.Empty, default, default, default) { }
}
