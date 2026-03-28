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
            migrationBuilder.AddColumn<int>(
                name: "MonitoringPointQuota",
                table: "Tenants",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SubscriptionPlan",
                table: "Tenants",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Farms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
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
                    CommonName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ScientificName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DefaultCaptureMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsSystemPest = table.Column<bool>(type: "bit", nullable: false),
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
                name: "ScoutingSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScouterId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    WeatherConditions = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoutingSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Users_ScouterId",
                        column: x => x.ScouterId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TrapTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrapTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Fields",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FarmId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    GeoBoundary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AreaHectares = table.Column<double>(type: "float", nullable: true),
                    CropType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Season = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
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
                    FarmId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FieldId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PointType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    TrapTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonitoringPoints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MonitoringPoints_Farms_FarmId",
                        column: x => x.FarmId,
                        principalTable: "Farms",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MonitoringPoints_Fields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "Fields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MonitoringPoints_TrapTypes_TrapTypeId",
                        column: x => x.TrapTypeId,
                        principalTable: "TrapTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
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
                    AllowUnknown = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssignedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
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
                    table.ForeignKey(
                        name: "FK_MonitoringPointPests_Users_AssignedByUserId",
                        column: x => x.AssignedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PestObservations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MonitoringPointId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsUnknownPest = table.Column<bool>(type: "bit", nullable: false),
                    UnknownPestDescription = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CaptureMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Count = table.Column<int>(type: "int", nullable: true),
                    Present = table.Column<bool>(type: "bit", nullable: true),
                    CapturedLat = table.Column<double>(type: "float", nullable: true),
                    CapturedLng = table.Column<double>(type: "float", nullable: true),
                    PhotoUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ObservedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PestObservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PestObservations_MonitoringPoints_MonitoringPointId",
                        column: x => x.MonitoringPointId,
                        principalTable: "MonitoringPoints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PestObservations_Pests_PestId",
                        column: x => x.PestId,
                        principalTable: "Pests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PestObservations_ScoutingSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ScoutingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Farms_TenantId",
                table: "Farms",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_FarmId",
                table: "Fields",
                column: "FarmId");

            migrationBuilder.CreateIndex(
                name: "IX_MonitoringPointPests_AssignedByUserId",
                table: "MonitoringPointPests",
                column: "AssignedByUserId");

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
                name: "IX_MonitoringPoints_FarmId",
                table: "MonitoringPoints",
                column: "FarmId");

            migrationBuilder.CreateIndex(
                name: "IX_MonitoringPoints_FieldId",
                table: "MonitoringPoints",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_MonitoringPoints_TrapTypeId",
                table: "MonitoringPoints",
                column: "TrapTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_PestObservations_MonitoringPointId_ObservedAt",
                table: "PestObservations",
                columns: new[] { "MonitoringPointId", "ObservedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PestObservations_PestId",
                table: "PestObservations",
                column: "PestId");

            migrationBuilder.CreateIndex(
                name: "IX_PestObservations_SessionId",
                table: "PestObservations",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_TenantId_CommonName",
                table: "Pests",
                columns: new[] { "TenantId", "CommonName" },
                unique: true,
                filter: "[DeletedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_ScouterId",
                table: "ScoutingSessions",
                column: "ScouterId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_TenantId",
                table: "ScoutingSessions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_Name",
                table: "TrapTypes",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MonitoringPointPests");

            migrationBuilder.DropTable(
                name: "PestObservations");

            migrationBuilder.DropTable(
                name: "MonitoringPoints");

            migrationBuilder.DropTable(
                name: "Pests");

            migrationBuilder.DropTable(
                name: "ScoutingSessions");

            migrationBuilder.DropTable(
                name: "Fields");

            migrationBuilder.DropTable(
                name: "TrapTypes");

            migrationBuilder.DropTable(
                name: "Farms");

            migrationBuilder.DropColumn(
                name: "MonitoringPointQuota",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "SubscriptionPlan",
                table: "Tenants");
        }
    }
}
