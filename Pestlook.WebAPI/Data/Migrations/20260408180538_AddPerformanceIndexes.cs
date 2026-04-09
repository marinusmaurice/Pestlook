using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ScoutingSessions_TenantId",
                table: "ScoutingSessions");

            migrationBuilder.DropIndex(
                name: "IX_Farms_TenantId",
                table: "Farms");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_TenantId_DeletedAt",
                table: "Traps",
                columns: new[] { "TenantId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_TenantId",
                table: "SessionObservations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_TenantId_CreatedAt",
                table: "ScoutingSessions",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_TenantId_DeletedAt",
                table: "ScoutingSessions",
                columns: new[] { "TenantId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Fields_TenantId_DeletedAt",
                table: "Fields",
                columns: new[] { "TenantId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Farms_TenantId_DeletedAt",
                table: "Farms",
                columns: new[] { "TenantId", "DeletedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Traps_TenantId_DeletedAt",
                table: "Traps");

            migrationBuilder.DropIndex(
                name: "IX_SessionObservations_TenantId",
                table: "SessionObservations");

            migrationBuilder.DropIndex(
                name: "IX_ScoutingSessions_TenantId_CreatedAt",
                table: "ScoutingSessions");

            migrationBuilder.DropIndex(
                name: "IX_ScoutingSessions_TenantId_DeletedAt",
                table: "ScoutingSessions");

            migrationBuilder.DropIndex(
                name: "IX_Fields_TenantId_DeletedAt",
                table: "Fields");

            migrationBuilder.DropIndex(
                name: "IX_Farms_TenantId_DeletedAt",
                table: "Farms");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_TenantId",
                table: "ScoutingSessions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Farms_TenantId",
                table: "Farms",
                column: "TenantId");
        }
    }
}
