using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddObservationQuotaAndMonthlySequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ObservationQuota",
                table: "Tenants",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MonthlySequence",
                table: "SessionObservations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsProRata",
                table: "BillingSnapshots",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ObservationQuota",
                table: "BillingSnapshots",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ObservationsCaptured",
                table: "BillingSnapshots",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ObservationsUsed",
                table: "BillingSnapshots",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ProRataDays",
                table: "BillingSnapshots",
                type: "int",
                nullable: true);

            // Backfill ObservationQuota on existing tenants based on their SubscriptionPlan
            migrationBuilder.Sql(@"
                UPDATE [Tenants]
                SET [ObservationQuota] = CASE [SubscriptionPlan]
                    WHEN 'Professional' THEN 2000
                    WHEN 'Enterprise'   THEN 999999
                    ELSE 300
                END
                WHERE [ObservationQuota] = 0;
            ");

            // Backfill MonthlySequence for existing observations that have ObservedAt set,
            // assigning sequential numbers within each tenant/month ordered by CreatedAt
            migrationBuilder.Sql(@"
                WITH ranked AS (
                    SELECT [Id],
                           ROW_NUMBER() OVER (
                               PARTITION BY [TenantId],
                                            YEAR([ObservedAt]),
                                            MONTH([ObservedAt])
                               ORDER BY [CreatedAt]
                           ) AS seq
                    FROM [SessionObservations]
                    WHERE [ObservedAt] IS NOT NULL
                )
                UPDATE so
                SET so.[MonthlySequence] = r.seq
                FROM [SessionObservations] so
                INNER JOIN ranked r ON so.[Id] = r.[Id];
            ");

            // Index to speed up quota count queries
            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE object_id = OBJECT_ID(N'SessionObservations')
                      AND name = N'IX_SessionObservations_TenantId_ObservedAt_MonthlySequence'
                )
                CREATE INDEX [IX_SessionObservations_TenantId_ObservedAt_MonthlySequence]
                    ON [SessionObservations] ([TenantId], [ObservedAt], [MonthlySequence])
                    WHERE [ObservedAt] IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ObservationQuota",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "MonthlySequence",
                table: "SessionObservations");

            migrationBuilder.DropColumn(
                name: "IsProRata",
                table: "BillingSnapshots");

            migrationBuilder.DropColumn(
                name: "ObservationQuota",
                table: "BillingSnapshots");

            migrationBuilder.DropColumn(
                name: "ObservationsCaptured",
                table: "BillingSnapshots");

            migrationBuilder.DropColumn(
                name: "ObservationsUsed",
                table: "BillingSnapshots");

            migrationBuilder.DropColumn(
                name: "ProRataDays",
                table: "BillingSnapshots");
        }
    }
}
