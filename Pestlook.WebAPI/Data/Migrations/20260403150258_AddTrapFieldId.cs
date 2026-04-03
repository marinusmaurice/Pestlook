using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTrapFieldId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FieldId",
                table: "Traps",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Traps_FieldId",
                table: "Traps",
                column: "FieldId");

            migrationBuilder.AddForeignKey(
                name: "FK_Traps_Fields_FieldId",
                table: "Traps",
                column: "FieldId",
                principalTable: "Fields",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Traps_Fields_FieldId",
                table: "Traps");

            migrationBuilder.DropIndex(
                name: "IX_Traps_FieldId",
                table: "Traps");

            migrationBuilder.DropColumn(
                name: "FieldId",
                table: "Traps");
        }
    }
}
