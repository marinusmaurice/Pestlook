using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConfirmExistingUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // All users created before email activation was introduced are pre-verified.
            // Set EmailConfirmed = 1 so they are not locked out after the feature is deployed.
            migrationBuilder.Sql("UPDATE [Users] SET [EmailConfirmed] = 1 WHERE [EmailConfirmed] = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty — we do not want to re-lock existing users on rollback.
        }
    }
}
