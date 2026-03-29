using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class SoftDeleteAndNullableUpdatedAtForTrapTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TrapTypes_Name",
                table: "TrapTypes");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "TrapTypes",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "TrapTypes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000005"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000006"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000007"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000008"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000009"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000a"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000b"),
                columns: new[] { "DeletedAt", "UpdatedAt" },
                values: new object[] { null, null });

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_Name",
                table: "TrapTypes",
                column: "Name",
                unique: true,
                filter: "[DeletedAt] IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TrapTypes_Name",
                table: "TrapTypes");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "TrapTypes");

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "TrapTypes",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000005"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000006"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000007"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000008"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000009"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000a"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000b"),
                column: "UpdatedAt",
                value: new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_Name",
                table: "TrapTypes",
                column: "Name",
                unique: true);
        }
    }
}
