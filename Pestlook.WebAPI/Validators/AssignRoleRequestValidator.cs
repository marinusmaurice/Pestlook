using FluentValidation;
using Pestlook.WebAPI.DTOs.Roles;

namespace Pestlook.WebAPI.Validators;

public sealed class AssignRoleRequestValidator : AbstractValidator<AssignRoleRequest>
{
    private static readonly string[] ValidRoles = ["SuperAdmin", "Admin", "User"];

    public AssignRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(r => ValidRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Role must be one of: {string.Join(", ", ValidRoles)}.");
    }
}
