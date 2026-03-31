using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTrapsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TrapId",
                table: "PestObservations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Traps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    TrapTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MonitoringPointId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Traps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Traps_MonitoringPoints_MonitoringPointId",
                        column: x => x.MonitoringPointId,
                        principalTable: "MonitoringPoints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Traps_TrapTypes_TrapTypeId",
                        column: x => x.TrapTypeId,
                        principalTable: "TrapTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PestObservations_TrapId",
                table: "PestObservations",
                column: "TrapId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_MonitoringPointId",
                table: "Traps",
                column: "MonitoringPointId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_TenantId_Barcode",
                table: "Traps",
                columns: new[] { "TenantId", "Barcode" },
                unique: true,
                filter: "[DeletedAt] IS NULL AND [Barcode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_TrapTypeId",
                table: "Traps",
                column: "TrapTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_PestObservations_Traps_TrapId",
                table: "PestObservations",
                column: "TrapId",
                principalTable: "Traps",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PestObservations_Traps_TrapId",
                table: "PestObservations");

            migrationBuilder.DropTable(
                name: "Traps");

            migrationBuilder.DropIndex(
                name: "IX_PestObservations_TrapId",
                table: "PestObservations");

            migrationBuilder.DropColumn(
                name: "TrapId",
                table: "PestObservations");
        }
    }
}
