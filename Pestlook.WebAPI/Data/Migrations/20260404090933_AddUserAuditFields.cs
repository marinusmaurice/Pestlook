using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "TrapTypes",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByUserId",
                table: "TrapTypes",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedByUserId",
                table: "TrapTypes",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "Traps",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByUserId",
                table: "Traps",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedByUserId",
                table: "Traps",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "SessionObservations",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByUserId",
                table: "SessionObservations",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedByUserId",
                table: "SessionObservations",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "ScoutingSessions",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByUserId",
                table: "ScoutingSessions",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedByUserId",
                table: "ScoutingSessions",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "Pests",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByUserId",
                table: "Pests",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedByUserId",
                table: "Pests",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "Fields",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByUserId",
                table: "Fields",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedByUserId",
                table: "Fields",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedByUserId",
                table: "Farms",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedByUserId",
                table: "Farms",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedByUserId",
                table: "Farms",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000005"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000006"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000007"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000008"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000009"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000a"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000b"),
                columns: new[] { "CreatedByUserId", "DeletedByUserId", "UpdatedByUserId" },
                values: new object[] { null, null, null });

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_CreatedByUserId",
                table: "TrapTypes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_DeletedByUserId",
                table: "TrapTypes",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_UpdatedByUserId",
                table: "TrapTypes",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_CreatedByUserId",
                table: "Traps",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_DeletedByUserId",
                table: "Traps",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_UpdatedByUserId",
                table: "Traps",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_CreatedByUserId",
                table: "SessionObservations",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_DeletedByUserId",
                table: "SessionObservations",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_UpdatedByUserId",
                table: "SessionObservations",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_CreatedByUserId",
                table: "ScoutingSessions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_DeletedByUserId",
                table: "ScoutingSessions",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_UpdatedByUserId",
                table: "ScoutingSessions",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_CreatedByUserId",
                table: "Pests",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_DeletedByUserId",
                table: "Pests",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_UpdatedByUserId",
                table: "Pests",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_CreatedByUserId",
                table: "Fields",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_DeletedByUserId",
                table: "Fields",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_UpdatedByUserId",
                table: "Fields",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Farms_CreatedByUserId",
                table: "Farms",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Farms_DeletedByUserId",
                table: "Farms",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Farms_UpdatedByUserId",
                table: "Farms",
                column: "UpdatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Farms_Users_CreatedByUserId",
                table: "Farms",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Farms_Users_DeletedByUserId",
                table: "Farms",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Farms_Users_UpdatedByUserId",
                table: "Farms",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Fields_Users_CreatedByUserId",
                table: "Fields",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Fields_Users_DeletedByUserId",
                table: "Fields",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Fields_Users_UpdatedByUserId",
                table: "Fields",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Pests_Users_CreatedByUserId",
                table: "Pests",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Pests_Users_DeletedByUserId",
                table: "Pests",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Pests_Users_UpdatedByUserId",
                table: "Pests",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ScoutingSessions_Users_CreatedByUserId",
                table: "ScoutingSessions",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ScoutingSessions_Users_DeletedByUserId",
                table: "ScoutingSessions",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ScoutingSessions_Users_UpdatedByUserId",
                table: "ScoutingSessions",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SessionObservations_Users_CreatedByUserId",
                table: "SessionObservations",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SessionObservations_Users_DeletedByUserId",
                table: "SessionObservations",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SessionObservations_Users_UpdatedByUserId",
                table: "SessionObservations",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Traps_Users_CreatedByUserId",
                table: "Traps",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Traps_Users_DeletedByUserId",
                table: "Traps",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Traps_Users_UpdatedByUserId",
                table: "Traps",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TrapTypes_Users_CreatedByUserId",
                table: "TrapTypes",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TrapTypes_Users_DeletedByUserId",
                table: "TrapTypes",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TrapTypes_Users_UpdatedByUserId",
                table: "TrapTypes",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Farms_Users_CreatedByUserId",
                table: "Farms");

            migrationBuilder.DropForeignKey(
                name: "FK_Farms_Users_DeletedByUserId",
                table: "Farms");

            migrationBuilder.DropForeignKey(
                name: "FK_Farms_Users_UpdatedByUserId",
                table: "Farms");

            migrationBuilder.DropForeignKey(
                name: "FK_Fields_Users_CreatedByUserId",
                table: "Fields");

            migrationBuilder.DropForeignKey(
                name: "FK_Fields_Users_DeletedByUserId",
                table: "Fields");

            migrationBuilder.DropForeignKey(
                name: "FK_Fields_Users_UpdatedByUserId",
                table: "Fields");

            migrationBuilder.DropForeignKey(
                name: "FK_Pests_Users_CreatedByUserId",
                table: "Pests");

            migrationBuilder.DropForeignKey(
                name: "FK_Pests_Users_DeletedByUserId",
                table: "Pests");

            migrationBuilder.DropForeignKey(
                name: "FK_Pests_Users_UpdatedByUserId",
                table: "Pests");

            migrationBuilder.DropForeignKey(
                name: "FK_ScoutingSessions_Users_CreatedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_ScoutingSessions_Users_DeletedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_ScoutingSessions_Users_UpdatedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_SessionObservations_Users_CreatedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropForeignKey(
                name: "FK_SessionObservations_Users_DeletedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropForeignKey(
                name: "FK_SessionObservations_Users_UpdatedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropForeignKey(
                name: "FK_Traps_Users_CreatedByUserId",
                table: "Traps");

            migrationBuilder.DropForeignKey(
                name: "FK_Traps_Users_DeletedByUserId",
                table: "Traps");

            migrationBuilder.DropForeignKey(
                name: "FK_Traps_Users_UpdatedByUserId",
                table: "Traps");

            migrationBuilder.DropForeignKey(
                name: "FK_TrapTypes_Users_CreatedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropForeignKey(
                name: "FK_TrapTypes_Users_DeletedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropForeignKey(
                name: "FK_TrapTypes_Users_UpdatedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropIndex(
                name: "IX_TrapTypes_CreatedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropIndex(
                name: "IX_TrapTypes_DeletedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropIndex(
                name: "IX_TrapTypes_UpdatedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropIndex(
                name: "IX_Traps_CreatedByUserId",
                table: "Traps");

            migrationBuilder.DropIndex(
                name: "IX_Traps_DeletedByUserId",
                table: "Traps");

            migrationBuilder.DropIndex(
                name: "IX_Traps_UpdatedByUserId",
                table: "Traps");

            migrationBuilder.DropIndex(
                name: "IX_SessionObservations_CreatedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropIndex(
                name: "IX_SessionObservations_DeletedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropIndex(
                name: "IX_SessionObservations_UpdatedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropIndex(
                name: "IX_ScoutingSessions_CreatedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropIndex(
                name: "IX_ScoutingSessions_DeletedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropIndex(
                name: "IX_ScoutingSessions_UpdatedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropIndex(
                name: "IX_Pests_CreatedByUserId",
                table: "Pests");

            migrationBuilder.DropIndex(
                name: "IX_Pests_DeletedByUserId",
                table: "Pests");

            migrationBuilder.DropIndex(
                name: "IX_Pests_UpdatedByUserId",
                table: "Pests");

            migrationBuilder.DropIndex(
                name: "IX_Fields_CreatedByUserId",
                table: "Fields");

            migrationBuilder.DropIndex(
                name: "IX_Fields_DeletedByUserId",
                table: "Fields");

            migrationBuilder.DropIndex(
                name: "IX_Fields_UpdatedByUserId",
                table: "Fields");

            migrationBuilder.DropIndex(
                name: "IX_Farms_CreatedByUserId",
                table: "Farms");

            migrationBuilder.DropIndex(
                name: "IX_Farms_DeletedByUserId",
                table: "Farms");

            migrationBuilder.DropIndex(
                name: "IX_Farms_UpdatedByUserId",
                table: "Farms");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "TrapTypes");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Traps");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Traps");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Traps");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "ScoutingSessions");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Pests");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Pests");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Pests");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Fields");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Fields");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Fields");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Farms");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Farms");

            migrationBuilder.DropColumn(
                name: "UpdatedByUserId",
                table: "Farms");
        }
    }
}
