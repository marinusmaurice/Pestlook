using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class TrapTypeTenantId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the old index only if it exists — it may be absent on databases
            // that were created before the SoftDelete migration recreated it.
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE object_id = OBJECT_ID(N'TrapTypes')
                      AND name = N'IX_TrapTypes_Name'
                )
                DROP INDEX [IX_TrapTypes_Name] ON [TrapTypes];
            ");

            // Add TenantId only if it doesn't already exist (guards against partial prior runs)
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'TrapTypes')
                      AND name = N'TenantId'
                )
                ALTER TABLE [TrapTypes] ADD [TenantId] uniqueidentifier NULL;
            ");

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

            // Create composite index only if it doesn't already exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE object_id = OBJECT_ID(N'TrapTypes')
                      AND name = N'IX_TrapTypes_TenantId_Name'
                )
                CREATE INDEX [IX_TrapTypes_TenantId_Name] ON [TrapTypes]([TenantId], [Name])
                WHERE [DeletedAt] IS NULL;
            ");

            // Add FK only if it doesn't already exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = N'FK_TrapTypes_Tenants_TenantId'
                      AND parent_object_id = OBJECT_ID(N'TrapTypes')
                )
                ALTER TABLE [TrapTypes] ADD CONSTRAINT [FK_TrapTypes_Tenants_TenantId]
                    FOREIGN KEY ([TenantId]) REFERENCES [Tenants]([Id]) ON DELETE NO ACTION;
            ");
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

            // Restore original index only if it doesn't already exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE object_id = OBJECT_ID(N'TrapTypes')
                      AND name = N'IX_TrapTypes_Name'
                )
                CREATE UNIQUE INDEX [IX_TrapTypes_Name] ON [TrapTypes]([Name])
                WHERE [DeletedAt] IS NULL;
            ");
        }
    }
}
