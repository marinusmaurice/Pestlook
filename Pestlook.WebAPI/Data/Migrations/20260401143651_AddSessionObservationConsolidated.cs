using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionObservationConsolidated : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "StartedAt",
                table: "ScoutingSessions",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<string>(
                name: "ScouterId",
                table: "ScoutingSessions",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<bool>(
                name: "IsPlanned",
                table: "ScoutingSessions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ScheduledDate",
                table: "ScoutingSessions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SessionObservations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ObservationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsPlanned = table.Column<bool>(type: "bit", nullable: false),
                    TrapId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CaptureMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionObservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionObservations_Pests_PestId",
                        column: x => x.PestId,
                        principalTable: "Pests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SessionObservations_ScoutingSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ScoutingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionObservations_Traps_TrapId",
                        column: x => x.TrapId,
                        principalTable: "Traps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_PestId",
                table: "SessionObservations",
                column: "PestId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_SessionId",
                table: "SessionObservations",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_TrapId",
                table: "SessionObservations",
                column: "TrapId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "IsPlanned",
                table: "ScoutingSessions");

            migrationBuilder.DropColumn(
                name: "ScheduledDate",
                table: "ScoutingSessions");

            migrationBuilder.AlterColumn<DateTime>(
                name: "StartedAt",
                table: "ScoutingSessions",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ScouterId",
                table: "ScoutingSessions",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);
        }
    }
}
