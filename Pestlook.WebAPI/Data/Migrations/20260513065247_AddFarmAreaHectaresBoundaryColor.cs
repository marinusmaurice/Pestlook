using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFarmAreaHectaresBoundaryColor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Farms' AND COLUMN_NAME = 'AreaHectares')
                    ALTER TABLE [Farms] ADD [AreaHectares] float NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Farms' AND COLUMN_NAME = 'BoundaryColor')
                    ALTER TABLE [Farms] ADD [BoundaryColor] nvarchar(20) NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "AreaHectares",  table: "Farms");
            migrationBuilder.DropColumn(name: "BoundaryColor", table: "Farms");
        }
    }
}
