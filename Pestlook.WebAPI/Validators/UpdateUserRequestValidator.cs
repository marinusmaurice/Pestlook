using FluentValidation;
using Pestlook.WebAPI.DTOs.Roles;

namespace Pestlook.WebAPI.Validators;

public sealed class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    private static readonly string[] ValidRoles = ["Admin", "Scout"];

    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(r => ValidRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Role must be one of: {string.Join(", ", ValidRoles)}.");
    }
}
