using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Pestlook.WebAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EntityName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExceptionLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StackTrace = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InnerMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RequestPath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RequestMethod = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    StatusCode = table.Column<int>(type: "int", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExceptionLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SavedReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DefinitionJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SubscriptionPlan = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MonitoringPointQuota = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoleClaims_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    FailedLoginAttempts = table.Column<int>(type: "int", nullable: false),
                    LockedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TemperatureUnit = table.Column<string>(type: "nvarchar(1)", maxLength: 1, nullable: false, defaultValue: "C"),
                    DistanceUnit = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: false, defaultValue: "km"),
                    Timezone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BillingSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    BillingMonth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ActivePointCount = table.Column<int>(type: "int", nullable: false),
                    AmountCents = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillingSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BillingSnapshots_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BillingSnapshots_Users_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Farms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    BoundaryGeoJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AreaHectares = table.Column<double>(type: "float", nullable: true),
                    BoundaryColor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DeletedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Farms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Farms_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Farms_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Farms_Users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Farms_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Feedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    PageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DeletedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Feedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Feedbacks_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Feedbacks_Users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Feedbacks_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Pests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommonName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ScientificName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DefaultCaptureMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsSystemPest = table.Column<bool>(type: "bit", nullable: false),
                    ThresholdCount = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DeletedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pests_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Pests_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Pests_Users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Pests_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByIp = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReplacedByToken = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrapTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DeletedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrapTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrapTypes_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrapTypes_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TrapTypes_Users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TrapTypes_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserClaims_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_UserLogins_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_UserTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Fields",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FarmId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    GeoBoundary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AreaHectares = table.Column<double>(type: "float", nullable: true),
                    BoundaryColor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    CropType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Season = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DeletedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Fields", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Fields_Farms_FarmId",
                        column: x => x.FarmId,
                        principalTable: "Farms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Fields_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Fields_Users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Fields_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ScoutingSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScouterId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    FieldId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FarmId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsPlanned = table.Column<bool>(type: "bit", nullable: false),
                    ScheduledDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    WeatherConditions = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    TemperatureCelsius = table.Column<double>(type: "float", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DeletedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoutingSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Farms_FarmId",
                        column: x => x.FarmId,
                        principalTable: "Farms",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Fields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "Fields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Users_ScouterId",
                        column: x => x.ScouterId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ScoutingSessions_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Traps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    TrapTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FieldId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DeletedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Traps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Traps_Fields_FieldId",
                        column: x => x.FieldId,
                        principalTable: "Fields",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Traps_TrapTypes_TrapTypeId",
                        column: x => x.TrapTypeId,
                        principalTable: "TrapTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Traps_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Traps_Users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Traps_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SessionObservations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ObservationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsPlanned = table.Column<bool>(type: "bit", nullable: false),
                    TrapId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CaptureMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Count = table.Column<int>(type: "int", nullable: true),
                    IsPresent = table.Column<bool>(type: "bit", nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    IsUnknownPest = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ThresholdCount = table.Column<int>(type: "int", nullable: true),
                    LifeStage = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ObservedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PhotoUrlsJson = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ObservationGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    UpdatedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DeletedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionObservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionObservations_Pests_PestId",
                        column: x => x.PestId,
                        principalTable: "Pests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SessionObservations_ScoutingSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ScoutingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionObservations_Traps_TrapId",
                        column: x => x.TrapId,
                        principalTable: "Traps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SessionObservations_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SessionObservations_Users_DeletedByUserId",
                        column: x => x.DeletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SessionObservations_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.InsertData(
                table: "TrapTypes",
                columns: new[] { "Id", "CreatedAt", "CreatedByUserId", "DeletedAt", "DeletedByUserId", "Description", "Name", "TenantId", "UpdatedAt", "UpdatedByUserId" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-0000-0000-000000000001"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Triangular tent-shaped trap with a sticky inner surface, typically baited with pheromone lures to attract and capture moths.", "Delta Trap", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-000000000002"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Container-style trap with a funnel lid; pests fall into the bucket and cannot escape, often used with pheromones or kill strips.", "Bucket Trap", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-000000000003"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Cone-shaped mesh or wire trap with a collection chamber at the top, designed for strong-flying moths like corn earworm.", "Cone Trap", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-000000000004"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Yellow adhesive card used to attract and trap flying insects such as aphids, whiteflies, and leafminers.", "Sticky Card (Yellow)", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-000000000005"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Blue adhesive card specifically effective for thrips monitoring.", "Sticky Card (Blue)", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-000000000006"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Red adhesive card used to attract leafhoppers.", "Sticky Card (Red)", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-000000000007"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Container buried flush with the ground surface to capture crawling insects like ground beetles and earwigs.", "Pitfall Trap", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-000000000008"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "UV or blacklight lamp with a collection container below, attracting night-flying moths and beetles.", "Light Trap", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-000000000009"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Lynfield or McPhail style trap with liquid lure (e.g., torula yeast or pheromone) for monitoring Mediterranean fruit flies and olive flies.", "Fruit Fly Trap", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-00000000000a"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "Red, sphere-shaped sticky trap that mimics ripe fruit, used in orchards for fruit worms and apple maggot.", "Red Ball Trap", null, null, null },
                    { new Guid("a0000000-0000-0000-0000-00000000000b"), new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, null, null, "A digital trap equipped with a camera and connectivity for remote image capture and automated pest counting.", "Smart / Automated Trap", null, null, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillingSnapshots_OwnerId",
                table: "BillingSnapshots",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_BillingSnapshots_TenantId_BillingMonth",
                table: "BillingSnapshots",
                columns: new[] { "TenantId", "BillingMonth" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Farms_CreatedByUserId",
                table: "Farms",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Farms_DeletedByUserId",
                table: "Farms",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Farms_TenantId_DeletedAt",
                table: "Farms",
                columns: new[] { "TenantId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Farms_UpdatedByUserId",
                table: "Farms",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Feedbacks_CreatedByUserId",
                table: "Feedbacks",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Feedbacks_DeletedByUserId",
                table: "Feedbacks",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Feedbacks_TenantId_CreatedAt",
                table: "Feedbacks",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Feedbacks_UpdatedByUserId",
                table: "Feedbacks",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_CreatedByUserId",
                table: "Fields",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_DeletedByUserId",
                table: "Fields",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_FarmId",
                table: "Fields",
                column: "FarmId");

            migrationBuilder.CreateIndex(
                name: "IX_Fields_TenantId_DeletedAt",
                table: "Fields",
                columns: new[] { "TenantId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Fields_UpdatedByUserId",
                table: "Fields",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_CreatedByUserId",
                table: "Pests",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_DeletedByUserId",
                table: "Pests",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_TenantId_CommonName",
                table: "Pests",
                columns: new[] { "TenantId", "CommonName" },
                unique: true,
                filter: "[DeletedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Pests_UpdatedByUserId",
                table: "Pests",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleClaims_RoleId",
                table: "RoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "Roles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SavedReports_TenantId_DeletedAt",
                table: "SavedReports",
                columns: new[] { "TenantId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_CreatedByUserId",
                table: "ScoutingSessions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_DeletedByUserId",
                table: "ScoutingSessions",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_FarmId",
                table: "ScoutingSessions",
                column: "FarmId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_FieldId",
                table: "ScoutingSessions",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_ScouterId",
                table: "ScoutingSessions",
                column: "ScouterId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_TenantId_CreatedAt",
                table: "ScoutingSessions",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_TenantId_DeletedAt",
                table: "ScoutingSessions",
                columns: new[] { "TenantId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingSessions_UpdatedByUserId",
                table: "ScoutingSessions",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_CreatedByUserId",
                table: "SessionObservations",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_DeletedByUserId",
                table: "SessionObservations",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_PestId",
                table: "SessionObservations",
                column: "PestId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_SessionId",
                table: "SessionObservations",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_SessionId_ObservationType",
                table: "SessionObservations",
                columns: new[] { "SessionId", "ObservationType" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_TenantId",
                table: "SessionObservations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_TenantId_CreatedAt",
                table: "SessionObservations",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_TrapId",
                table: "SessionObservations",
                column: "TrapId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionObservations_UpdatedByUserId",
                table: "SessionObservations",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_Slug",
                table: "Tenants",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Traps_CreatedByUserId",
                table: "Traps",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_DeletedByUserId",
                table: "Traps",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_FieldId",
                table: "Traps",
                column: "FieldId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_TenantId_Barcode",
                table: "Traps",
                columns: new[] { "TenantId", "Barcode" },
                unique: true,
                filter: "[DeletedAt] IS NULL AND [Barcode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_TenantId_DeletedAt",
                table: "Traps",
                columns: new[] { "TenantId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Traps_TrapTypeId",
                table: "Traps",
                column: "TrapTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Traps_UpdatedByUserId",
                table: "Traps",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_CreatedByUserId",
                table: "TrapTypes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_DeletedByUserId",
                table: "TrapTypes",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_TenantId_Name",
                table: "TrapTypes",
                columns: new[] { "TenantId", "Name" },
                filter: "[DeletedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_TrapTypes_UpdatedByUserId",
                table: "TrapTypes",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserClaims_UserId",
                table: "UserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_UserId",
                table: "UserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleId",
                table: "UserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "Users",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_Users_TenantId",
                table: "Users",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "Users",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "BillingSnapshots");

            migrationBuilder.DropTable(
                name: "ExceptionLogs");

            migrationBuilder.DropTable(
                name: "Feedbacks");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "RoleClaims");

            migrationBuilder.DropTable(
                name: "SavedReports");

            migrationBuilder.DropTable(
                name: "SessionObservations");

            migrationBuilder.DropTable(
                name: "UserClaims");

            migrationBuilder.DropTable(
                name: "UserLogins");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "UserTokens");

            migrationBuilder.DropTable(
                name: "Pests");

            migrationBuilder.DropTable(
                name: "ScoutingSessions");

            migrationBuilder.DropTable(
                name: "Traps");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Fields");

            migrationBuilder.DropTable(
                name: "TrapTypes");

            migrationBuilder.DropTable(
                name: "Farms");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Tenants");
        }
    }
}
