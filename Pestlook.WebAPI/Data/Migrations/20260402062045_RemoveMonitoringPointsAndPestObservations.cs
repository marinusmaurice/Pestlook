using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveMonitoringPointsAndPestObservations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Traps_MonitoringPoints_MonitoringPointId",
                table: "Traps");

            migrationBuilder.DropTable(
                name: "MonitoringPointPests");

            migrationBuilder.DropTable(
                name: "PestObservations");

            migrationBuilder.DropTable(
                name: "MonitoringPoints");

            migrationBuilder.DropIndex(
                name: "IX_Traps_MonitoringPointId",
                table: "Traps");

            migrationBuilder.DropColumn(
                name: "MonitoringPointId",
                table: "Traps");

            migrationBuilder.AddColumn<string>(
                name: "PhotoUrlsJson",
                table: "SessionObservations",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhotoUrlsJson",
                table: "SessionObservations");

            migrationBuilder.AddColumn<Guid>(
                name: "MonitoringPointId",
                table: "Traps",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MonitoringPoints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    FarmId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FieldId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TrapTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PointType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                    AssignedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    MonitoringPointId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AllowUnknown = table.Column<bool>(type: "bit", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
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
                    MonitoringPointId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TrapId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CaptureMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CapturedLat = table.Column<double>(type: "float", nullable: true),
                    CapturedLng = table.Column<double>(type: "float", nullable: true),
                    Count = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsUnknownPest = table.Column<bool>(type: "bit", nullable: false),
                    LifeStage = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ObservedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PhotoUrlsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Present = table.Column<bool>(type: "bit", nullable: true),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UnknownPestDescription = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
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
                    table.ForeignKey(
                        name: "FK_PestObservations_Traps_TrapId",
                        column: x => x.TrapId,
                        principalTable: "Traps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Traps_MonitoringPointId",
                table: "Traps",
                column: "MonitoringPointId");

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
                name: "IX_PestObservations_TrapId",
                table: "PestObservations",
                column: "TrapId");

            migrationBuilder.AddForeignKey(
                name: "FK_Traps_MonitoringPoints_MonitoringPointId",
                table: "Traps",
                column: "MonitoringPointId",
                principalTable: "MonitoringPoints",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
