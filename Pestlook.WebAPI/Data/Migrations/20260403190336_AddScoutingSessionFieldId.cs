using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddScoutingSessionFieldId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FieldId",
                table: "ScoutingSessions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_FieldId",
                table: "ScoutingSessions",
                column: "FieldId");

            migrationBuilder.AddForeignKey(
                name: "FK_ScoutingSessions_Fields_FieldId",
                table: "ScoutingSessions",
                column: "FieldId",
                principalTable: "Fields",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ScoutingSessions_Fields_FieldId",
                table: "ScoutingSessions");

            migrationBuilder.DropIndex(
                name: "IX_ScoutingSessions_FieldId",
                table: "ScoutingSessions");

            migrationBuilder.DropColumn(
                name: "FieldId",
                table: "ScoutingSessions");
        }
    }
}
