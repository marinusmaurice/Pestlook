using FluentValidation;
using Pestlook.WebAPI.DTOs.Feedback;

namespace Pestlook.WebAPI.Validators;

public sealed class CreateFeedbackRequestValidator : AbstractValidator<CreateFeedbackRequest>
{
    public CreateFeedbackRequestValidator()
    {
        RuleFor(x => x.Category)
            .IsInEnum().WithMessage("Feedback category must be a valid value.");

        RuleFor(x => x.Subject)
            .NotEmpty().WithMessage("Subject is required.")
            .MaximumLength(200);

        RuleFor(x => x.Message)
            .NotEmpty().WithMessage("Message is required.")
            .MaximumLength(4000);

        RuleFor(x => x.PageUrl)
            .MaximumLength(500);
    }
}
