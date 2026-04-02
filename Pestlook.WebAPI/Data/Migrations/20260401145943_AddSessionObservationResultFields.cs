using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionObservationResultFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Count",
                table: "SessionObservations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPresent",
                table: "SessionObservations",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsUnknownPest",
                table: "SessionObservations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "SessionObservations",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LifeStage",
                table: "SessionObservations",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "SessionObservations",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "SessionObservations",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Count",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "IsPresent",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "IsUnknownPest",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "LifeStage",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "SessionObservations");
        }
    }
}
