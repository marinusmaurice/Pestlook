using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class SchemaEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ThresholdCount",
                table: "Pests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LifeStage",
                table: "PestObservations",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "FarmId",
                table: "MonitoringPoints",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "BoundaryGeoJson",
                table: "Farms",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BillingSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    BillingMonth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActivePointCount = table.Column<int>(type: "int", nullable: false),
                    AmountCents = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillingSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BillingSnapshots_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BillingSnapshots_Users_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillingSnapshots_OwnerId",
                table: "BillingSnapshots",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_BillingSnapshots_TenantId_BillingMonth",
                table: "BillingSnapshots",
                columns: new[] { "TenantId", "BillingMonth" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BillingSnapshots");

            migrationBuilder.DropColumn(
                name: "ThresholdCount",
                table: "Pests");

            migrationBuilder.DropColumn(
                name: "LifeStage",
                table: "PestObservations");

            migrationBuilder.DropColumn(
                name: "BoundaryGeoJson",
                table: "Farms");

            migrationBuilder.AlterColumn<Guid>(
                name: "FarmId",
                table: "MonitoringPoints",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
