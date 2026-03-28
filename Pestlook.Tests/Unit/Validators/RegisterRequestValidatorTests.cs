using FluentAssertions;
using FluentValidation.TestHelper;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.Validators;

namespace Pestlook.Tests.Unit.Validators;

public sealed class RegisterRequestValidatorTests
{
    private readonly RegisterRequestValidator _validator = new();

    private static RegisterRequest Valid() =>
        new("user@test.com", "P@ssw0rd1!", "John", "Doe");

    [Theory]
    [InlineData("")]
    [InlineData("invalid")]
    [InlineData("a@")]
    public void Email_WhenInvalid_ShouldFail(string email)
    {
        var result = _validator.TestValidate(Valid() with { Email = email });
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Theory]
    [InlineData("short1!")]          // too short
    [InlineData("nouppercase1!")]    // no uppercase
    [InlineData("NOLOWERCASE1!")]    // no lowercase
    [InlineData("NoDigitHere!")]     // no digit
    [InlineData("NoSpecial12")]      // no special char
    public void Password_WhenWeakRule_ShouldFail(string password)
    {
        var result = _validator.TestValidate(Valid() with { Password = password });
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_WhenStrong_ShouldPass()
    {
        var result = _validator.TestValidate(Valid());
        result.ShouldNotHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void FirstName_WhenEmpty_ShouldFail()
    {
        var result = _validator.TestValidate(Valid() with { FirstName = "" });
        result.ShouldHaveValidationErrorFor(x => x.FirstName);
    }

    [Fact]
    public void LastName_WhenEmpty_ShouldFail()
    {
        var result = _validator.TestValidate(Valid() with { LastName = "" });
        result.ShouldHaveValidationErrorFor(x => x.LastName);
    }

    [Fact]
    public void WhenAllValid_ShouldPassWithNoErrors()
    {
        var result = _validator.TestValidate(Valid());
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Scout")]
    public void Role_WhenKnownRole_ShouldPass(string role)
    {
        var result = _validator.TestValidate(Valid() with { Role = role });
        result.ShouldNotHaveValidationErrorFor(x => x.Role);
    }

    [Fact]
    public void Role_WhenNull_ShouldPass()
    {
        var result = _validator.TestValidate(Valid());
        result.ShouldNotHaveValidationErrorFor(x => x.Role);
    }

    [Theory]
    [InlineData("Farmer")]
    [InlineData("SuperAdmin")]
    public void Role_WhenInvalid_ShouldFail(string role)
    {
        var result = _validator.TestValidate(Valid() with { Role = role });
        result.ShouldHaveValidationErrorFor(x => x.Role);
    }
}
