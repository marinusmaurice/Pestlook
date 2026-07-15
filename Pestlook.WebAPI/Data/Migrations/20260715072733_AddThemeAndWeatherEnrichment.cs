using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddThemeAndWeatherEnrichment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Theme",
                table: "Users",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "light");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Theme",
                table: "Users");
        }
    }
}
