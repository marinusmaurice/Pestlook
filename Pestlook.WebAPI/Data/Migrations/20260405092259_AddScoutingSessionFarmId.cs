using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddScoutingSessionFarmId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FarmId",
                table: "ScoutingSessions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_FarmId",
                table: "ScoutingSessions",
                column: "FarmId");

            migrationBuilder.AddForeignKey(
                name: "FK_ScoutingSessions_Farms_FarmId",
                table: "ScoutingSessions",
                column: "FarmId",
                principalTable: "Farms",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ScoutingSessions_Farms_FarmId",
                table: "ScoutingSessions");

            migrationBuilder.DropIndex(
                name: "IX_ScoutingSessions_FarmId",
                table: "ScoutingSessions");

            migrationBuilder.DropColumn(
                name: "FarmId",
                table: "ScoutingSessions");
        }
    }
}
