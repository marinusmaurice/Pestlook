using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionPlanConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SubscriptionPlanConfigs",
                columns: table => new
                {
                    Plan = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ObservationQuota = table.Column<int>(type: "int", nullable: false),
                    AmountCents = table.Column<int>(type: "int", nullable: false),
                    MonitoringPointQuota = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlanConfigs", x => x.Plan);
                });

            migrationBuilder.InsertData(
                table: "SubscriptionPlanConfigs",
                columns: new[] { "Plan", "AmountCents", "MonitoringPointQuota", "ObservationQuota" },
                values: new object[,]
                {
                    { "Basic", 2500, 10, 300 },
                    { "Enterprise", 0, 200, 999999 },
                    { "Professional", 15000, 50, 2000 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SubscriptionPlanConfigs");
        }
    }
}
