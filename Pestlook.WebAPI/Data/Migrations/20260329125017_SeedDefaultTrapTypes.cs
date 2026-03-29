using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeedDefaultTrapTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "TrapTypes",
                columns: new[] { "Id", "Description", "Name" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-0000-0000-000000000001"), "Triangular tent-shaped trap with a sticky inner surface, typically baited with pheromone lures to attract and capture moths.", "Delta Trap" },
                    { new Guid("a0000000-0000-0000-0000-000000000002"), "Container-style trap with a funnel lid; pests fall into the bucket and cannot escape, often used with pheromones or kill strips.", "Bucket Trap" },
                    { new Guid("a0000000-0000-0000-0000-000000000003"), "Cone-shaped mesh or wire trap with a collection chamber at the top, designed for strong-flying moths like corn earworm.", "Cone Trap" },
                    { new Guid("a0000000-0000-0000-0000-000000000004"), "Yellow adhesive card used to attract and trap flying insects such as aphids, whiteflies, and leafminers.", "Sticky Card (Yellow)" },
                    { new Guid("a0000000-0000-0000-0000-000000000005"), "Blue adhesive card specifically effective for thrips monitoring.", "Sticky Card (Blue)" },
                    { new Guid("a0000000-0000-0000-0000-000000000006"), "Red adhesive card used to attract leafhoppers.", "Sticky Card (Red)" },
                    { new Guid("a0000000-0000-0000-0000-000000000007"), "Container buried flush with the ground surface to capture crawling insects like ground beetles and earwigs.", "Pitfall Trap" },
                    { new Guid("a0000000-0000-0000-0000-000000000008"), "UV or blacklight lamp with a collection container below, attracting night-flying moths and beetles.", "Light Trap" },
                    { new Guid("a0000000-0000-0000-0000-000000000009"), "Lynfield or McPhail style trap with liquid lure (e.g., torula yeast or pheromone) for monitoring Mediterranean fruit flies and olive flies.", "Fruit Fly Trap" },
                    { new Guid("a0000000-0000-0000-0000-00000000000a"), "Red, sphere-shaped sticky trap that mimics ripe fruit, used in orchards for fruit worms and apple maggot.", "Red Ball Trap" },
                    { new Guid("a0000000-0000-0000-0000-00000000000b"), "A digital trap equipped with a camera and connectivity for remote image capture and automated pest counting.", "Smart / Automated Trap" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000001"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000004"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000006"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000007"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000008"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-000000000009"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000a"));

            migrationBuilder.DeleteData(
                table: "TrapTypes",
                keyColumn: "Id",
                keyValue: new Guid("a0000000-0000-0000-0000-00000000000b"));
        }
    }
}
