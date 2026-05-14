using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class __TempDiff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TrapTypes_Name",
                table: "TrapTypes");

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "TrapTypes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000005"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000006"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000007"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000008"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000009"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000a"),
                column: "TenantId",
                value: null);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000b"),
                column: "TenantId",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_TenantId_Name",
                table: "TrapTypes",
                columns: new[] { "TenantId", "Name" },
                filter: "[DeletedAt] IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_TrapTypes_Tenants_TenantId",
                table: "TrapTypes",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TrapTypes_Tenants_TenantId",
                table: "TrapTypes");

            migrationBuilder.DropIndex(
                name: "IX_TrapTypes_TenantId_Name",
                table: "TrapTypes");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "TrapTypes");

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_Name",
                table: "TrapTypes",
                column: "Name",
                unique: true,
                filter: "[DeletedAt] IS NULL");
        }
    }
}
