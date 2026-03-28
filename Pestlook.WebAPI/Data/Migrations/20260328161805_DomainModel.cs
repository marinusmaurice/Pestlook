using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class DomainModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.CreateTable(
                name: "Farms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    BoundaryGeoJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Farms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Farms_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Pests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ScientificName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ThresholdCount = table.Column<int>(type: "int", nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pests_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Fields",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FarmId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CropType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BoundaryGeoJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Fields", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Fields_Farms_FarmId",
                        column: x => x.FarmId,
                        principalTable: "Farms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MonitoringPoints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FieldId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PointType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    TrapType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonitoringPoints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MonitoringPoints_Fields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "Fields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MonitoringPoints_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MonitoringPointPests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MonitoringPointId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsTargeted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonitoringPointPests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MonitoringPointPests_MonitoringPoints_MonitoringPointId",
                        column: x => x.MonitoringPointId,
                        principalTable: "MonitoringPoints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MonitoringPointPests_Pests_PestId",
                        column: x => x.PestId,
                        principalTable: "Pests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Observations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MonitoringPointId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScoutUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PestNameText = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Count = table.Column<int>(type: "int", nullable: true),
                    Presence = table.Column<bool>(type: "bit", nullable: true),
                    LifeStage = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhotoUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ObservedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Observations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Observations_MonitoringPoints_MonitoringPointId",
                        column: x => x.MonitoringPointId,
                        principalTable: "MonitoringPoints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Observations_Pests_PestId",
                        column: x => x.PestId,
                        principalTable: "Pests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Observations_Users_ScoutUserId",
                        column: x => x.ScoutUserId,
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

            migrationBuilder.CreateIndex(
                name: "IX_Farms_TenantId",
                table: "Farms",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_FarmId",
                table: "Fields",
                column: "FarmId");

            migrationBuilder.CreateIndex(
                name: "IX_MonitoringPointPests_MonitoringPointId_PestId",
                table: "MonitoringPointPests",
                columns: new[] { "MonitoringPointId", "PestId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MonitoringPointPests_PestId",
                table: "MonitoringPointPests",
                column: "PestId");

            migrationBuilder.CreateIndex(
                name: "IX_MonitoringPoints_CreatedByUserId",
                table: "MonitoringPoints",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MonitoringPoints_FieldId",
                table: "MonitoringPoints",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_Observations_MonitoringPointId_ObservedAt",
                table: "Observations",
                columns: new[] { "MonitoringPointId", "ObservedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Observations_PestId",
                table: "Observations",
                column: "PestId");

            migrationBuilder.CreateIndex(
                name: "IX_Observations_ScoutUserId",
                table: "Observations",
                column: "ScoutUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_TenantId_Name",
                table: "Pests",
                columns: new[] { "TenantId", "Name" },
                unique: true,
                filter: "[DeletedAt] IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BillingSnapshots");

            migrationBuilder.DropTable(
                name: "MonitoringPointPests");

            migrationBuilder.DropTable(
                name: "Observations");

            migrationBuilder.DropTable(
                name: "MonitoringPoints");

            migrationBuilder.DropTable(
                name: "Pests");

            migrationBuilder.DropTable(
                name: "Fields");

            migrationBuilder.DropTable(
                name: "Farms");
        }
    }
}
