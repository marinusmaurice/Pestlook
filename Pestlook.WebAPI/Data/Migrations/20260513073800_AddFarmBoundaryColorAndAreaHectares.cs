using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFarmBoundaryColorAndAreaHectares : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Columns AreaHectares and BoundaryColor were already added to Farms
            // via guarded SQL in migration 20260513065247_AddFarmAreaHectaresBoundaryColor.
            // This migration exists solely to update the EF model snapshot so that
            // PendingModelChangesWarning is resolved.
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                               WHERE TABLE_NAME='Farms' AND COLUMN_NAME='AreaHectares')
                    ALTER TABLE [Farms] ADD [AreaHectares] float NULL;

                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                               WHERE TABLE_NAME='Farms' AND COLUMN_NAME='BoundaryColor')
                    ALTER TABLE [Farms] ADD [BoundaryColor] nvarchar(max) NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AreaHectares",
                table: "Farms");

            migrationBuilder.DropColumn(
                name: "BoundaryColor",
                table: "Farms");
        }
    }
}
