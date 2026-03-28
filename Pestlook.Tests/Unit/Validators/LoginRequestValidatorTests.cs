using FluentAssertions;
using FluentValidation.TestHelper;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.Validators;

namespace Pestlook.Tests.Unit.Validators;

public sealed class LoginRequestValidatorTests
{
    private readonly LoginRequestValidator _validator = new();

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("missing@")]
    public void Email_WhenInvalid_ShouldHaveValidationError(string email)
    {
        var result = _validator.TestValidate(new LoginRequest(email, "pass"));
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Email_WhenValid_ShouldNotHaveValidationError()
    {
        var result = _validator.TestValidate(new LoginRequest("valid@email.com", "pass"));
        result.ShouldNotHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Password_WhenEmpty_ShouldHaveValidationError()
    {
        var result = _validator.TestValidate(new LoginRequest("a@b.com", ""));
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_WhenProvided_ShouldNotHaveValidationError()
    {
        var result = _validator.TestValidate(new LoginRequest("a@b.com", "anyPass"));
        result.ShouldNotHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void WhenAllValid_ShouldPassValidation()
    {
        var result = _validator.TestValidate(new LoginRequest("user@domain.com", "S3cret!"));
        result.IsValid.Should().BeTrue();
    }
}
