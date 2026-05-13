IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [AuditLogs] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NULL,
        [UserId] nvarchar(max) NULL,
        [EntityName] nvarchar(200) NOT NULL,
        [EntityId] nvarchar(max) NULL,
        [Action] nvarchar(50) NOT NULL,
        [OldValues] nvarchar(max) NULL,
        [NewValues] nvarchar(max) NULL,
        [IpAddress] nvarchar(50) NULL,
        [Timestamp] datetime2 NOT NULL,
        CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [ExceptionLogs] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NULL,
        [UserId] nvarchar(max) NULL,
        [Message] nvarchar(max) NOT NULL,
        [StackTrace] nvarchar(max) NULL,
        [InnerMessage] nvarchar(max) NULL,
        [RequestPath] nvarchar(500) NULL,
        [RequestMethod] nvarchar(10) NULL,
        [StatusCode] int NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        CONSTRAINT [PK_ExceptionLogs] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [Roles] (
        [Id] nvarchar(450) NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_Roles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [Tenants] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Slug] nvarchar(100) NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Tenants] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [RoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_RoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RoleClaims_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] nvarchar(450) NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [FirstName] nvarchar(100) NOT NULL,
        [LastName] nvarchar(100) NOT NULL,
        [IsActive] bit NOT NULL,
        [FailedLoginAttempts] int NOT NULL,
        [LockedUntil] datetime2 NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Users_Tenants_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [Tenants] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [RefreshTokens] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] nvarchar(450) NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [Token] nvarchar(500) NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedByIp] nvarchar(max) NOT NULL,
        [RevokedAt] datetime2 NULL,
        [ReplacedByToken] nvarchar(max) NULL,
        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RefreshTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [UserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_UserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserClaims_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [UserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_UserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_UserLogins_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [UserRoles] (
        [UserId] nvarchar(450) NOT NULL,
        [RoleId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_UserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_UserRoles_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_UserRoles_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE TABLE [UserTokens] (
        [UserId] nvarchar(450) NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_UserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_UserTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RefreshTokens_Token] ON [RefreshTokens] ([Token]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_RefreshTokens_UserId] ON [RefreshTokens] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_RoleClaims_RoleId] ON [RoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [Roles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Tenants_Slug] ON [Tenants] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_UserClaims_UserId] ON [UserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_UserLogins_UserId] ON [UserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_UserRoles_RoleId] ON [UserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [Users] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Users_TenantId] ON [Users] ([TenantId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [Users] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328130123_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260328130123_InitialCreate', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    ALTER TABLE [Tenants] ADD [MonitoringPointQuota] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    ALTER TABLE [Tenants] ADD [SubscriptionPlan] nvarchar(50) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE TABLE [Farms] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Address] nvarchar(500) NULL,
        [Latitude] float NULL,
        [Longitude] float NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Farms] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Farms_Tenants_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [Tenants] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE TABLE [Pests] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [CommonName] nvarchar(200) NOT NULL,
        [ScientificName] nvarchar(300) NULL,
        [Category] nvarchar(50) NOT NULL,
        [DefaultCaptureMode] nvarchar(50) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [ImageUrl] nvarchar(500) NULL,
        [IsSystemPest] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Pests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Pests_Tenants_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [Tenants] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE TABLE [ScoutingSessions] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [ScouterId] nvarchar(450) NOT NULL,
        [StartedAt] datetime2 NOT NULL,
        [CompletedAt] datetime2 NULL,
        [WeatherConditions] nvarchar(200) NULL,
        [Notes] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ScoutingSessions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ScoutingSessions_Tenants_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [Tenants] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ScoutingSessions_Users_ScouterId] FOREIGN KEY ([ScouterId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE TABLE [TrapTypes] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        CONSTRAINT [PK_TrapTypes] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE TABLE [Fields] (
        [Id] uniqueidentifier NOT NULL,
        [FarmId] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [GeoBoundary] nvarchar(max) NULL,
        [AreaHectares] float NULL,
        [CropType] nvarchar(100) NULL,
        [Season] nvarchar(100) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Fields] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Fields_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE TABLE [MonitoringPoints] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [FarmId] uniqueidentifier NOT NULL,
        [FieldId] uniqueidentifier NULL,
        [CreatedByUserId] nvarchar(450) NULL,
        [Name] nvarchar(200) NULL,
        [PointType] nvarchar(50) NOT NULL,
        [Latitude] float NOT NULL,
        [Longitude] float NOT NULL,
        [TrapTypeId] uniqueidentifier NULL,
        [IsActive] bit NOT NULL,
        [Notes] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_MonitoringPoints] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MonitoringPoints_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]),
        CONSTRAINT [FK_MonitoringPoints_Fields_FieldId] FOREIGN KEY ([FieldId]) REFERENCES [Fields] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_MonitoringPoints_TrapTypes_TrapTypeId] FOREIGN KEY ([TrapTypeId]) REFERENCES [TrapTypes] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_MonitoringPoints_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE TABLE [MonitoringPointPests] (
        [Id] uniqueidentifier NOT NULL,
        [MonitoringPointId] uniqueidentifier NOT NULL,
        [PestId] uniqueidentifier NOT NULL,
        [AllowUnknown] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [AssignedAt] datetime2 NOT NULL,
        [AssignedByUserId] nvarchar(450) NULL,
        CONSTRAINT [PK_MonitoringPointPests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MonitoringPointPests_MonitoringPoints_MonitoringPointId] FOREIGN KEY ([MonitoringPointId]) REFERENCES [MonitoringPoints] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_MonitoringPointPests_Pests_PestId] FOREIGN KEY ([PestId]) REFERENCES [Pests] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_MonitoringPointPests_Users_AssignedByUserId] FOREIGN KEY ([AssignedByUserId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE TABLE [PestObservations] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [MonitoringPointId] uniqueidentifier NOT NULL,
        [PestId] uniqueidentifier NULL,
        [IsUnknownPest] bit NOT NULL,
        [UnknownPestDescription] nvarchar(500) NULL,
        [CaptureMode] nvarchar(50) NOT NULL,
        [Count] int NULL,
        [Present] bit NULL,
        [CapturedLat] float NULL,
        [CapturedLng] float NULL,
        [PhotoUrlsJson] nvarchar(max) NULL,
        [Notes] nvarchar(1000) NULL,
        [ObservedAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PestObservations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PestObservations_MonitoringPoints_MonitoringPointId] FOREIGN KEY ([MonitoringPointId]) REFERENCES [MonitoringPoints] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PestObservations_Pests_PestId] FOREIGN KEY ([PestId]) REFERENCES [Pests] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_PestObservations_ScoutingSessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [ScoutingSessions] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_Farms_TenantId] ON [Farms] ([TenantId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_Fields_FarmId] ON [Fields] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_MonitoringPointPests_AssignedByUserId] ON [MonitoringPointPests] ([AssignedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_MonitoringPointPests_MonitoringPointId_PestId] ON [MonitoringPointPests] ([MonitoringPointId], [PestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_MonitoringPointPests_PestId] ON [MonitoringPointPests] ([PestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_MonitoringPoints_CreatedByUserId] ON [MonitoringPoints] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_MonitoringPoints_FarmId] ON [MonitoringPoints] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_MonitoringPoints_FieldId] ON [MonitoringPoints] ([FieldId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_MonitoringPoints_TrapTypeId] ON [MonitoringPoints] ([TrapTypeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_PestObservations_MonitoringPointId_ObservedAt] ON [PestObservations] ([MonitoringPointId], [ObservedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_PestObservations_PestId] ON [PestObservations] ([PestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_PestObservations_SessionId] ON [PestObservations] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Pests_TenantId_CommonName] ON [Pests] ([TenantId], [CommonName]) WHERE [DeletedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_ScouterId] ON [ScoutingSessions] ([ScouterId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_TenantId] ON [ScoutingSessions] ([TenantId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_TrapTypes_Name] ON [TrapTypes] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328164027_DomainModel'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260328164027_DomainModel', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328195711_SchemaEnhancements'
)
BEGIN
    ALTER TABLE [Pests] ADD [ThresholdCount] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328195711_SchemaEnhancements'
)
BEGIN
    ALTER TABLE [PestObservations] ADD [LifeStage] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328195711_SchemaEnhancements'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[MonitoringPoints]') AND [c].[name] = N'FarmId');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [MonitoringPoints] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [MonitoringPoints] ALTER COLUMN [FarmId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328195711_SchemaEnhancements'
)
BEGIN
    ALTER TABLE [Farms] ADD [BoundaryGeoJson] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328195711_SchemaEnhancements'
)
BEGIN
    CREATE TABLE [BillingSnapshots] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [OwnerId] nvarchar(450) NOT NULL,
        [BillingMonth] datetime2 NOT NULL,
        [ActivePointCount] int NOT NULL,
        [AmountCents] int NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_BillingSnapshots] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BillingSnapshots_Tenants_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [Tenants] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_BillingSnapshots_Users_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328195711_SchemaEnhancements'
)
BEGIN
    CREATE INDEX [IX_BillingSnapshots_OwnerId] ON [BillingSnapshots] ([OwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328195711_SchemaEnhancements'
)
BEGIN
    CREATE UNIQUE INDEX [IX_BillingSnapshots_TenantId_BillingMonth] ON [BillingSnapshots] ([TenantId], [BillingMonth]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328195711_SchemaEnhancements'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260328195711_SchemaEnhancements', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329110523_AddSoftDeleteToAllEntities'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [DeletedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329110523_AddSoftDeleteToAllEntities'
)
BEGIN
    ALTER TABLE [PestObservations] ADD [DeletedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329110523_AddSoftDeleteToAllEntities'
)
BEGIN
    ALTER TABLE [MonitoringPointPests] ADD [DeletedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329110523_AddSoftDeleteToAllEntities'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260329110523_AddSoftDeleteToAllEntities', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329120542_AddIsActiveToFarmsAndFields'
)
BEGIN
    ALTER TABLE [Fields] ADD [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329120542_AddIsActiveToFarmsAndFields'
)
BEGIN
    ALTER TABLE [Farms] ADD [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329120542_AddIsActiveToFarmsAndFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260329120542_AddIsActiveToFarmsAndFields', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125017_SeedDefaultTrapTypes'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Description', N'Name') AND [object_id] = OBJECT_ID(N'[TrapTypes]'))
        SET IDENTITY_INSERT [TrapTypes] ON;
    EXEC(N'INSERT INTO [TrapTypes] ([Id], [Description], [Name])
    VALUES (''a0000000-0000-0000-0000-000000000001'', N''Triangular tent-shaped trap with a sticky inner surface, typically baited with pheromone lures to attract and capture moths.'', N''Delta Trap''),
    (''a0000000-0000-0000-0000-000000000002'', N''Container-style trap with a funnel lid; pests fall into the bucket and cannot escape, often used with pheromones or kill strips.'', N''Bucket Trap''),
    (''a0000000-0000-0000-0000-000000000003'', N''Cone-shaped mesh or wire trap with a collection chamber at the top, designed for strong-flying moths like corn earworm.'', N''Cone Trap''),
    (''a0000000-0000-0000-0000-000000000004'', N''Yellow adhesive card used to attract and trap flying insects such as aphids, whiteflies, and leafminers.'', N''Sticky Card (Yellow)''),
    (''a0000000-0000-0000-0000-000000000005'', N''Blue adhesive card specifically effective for thrips monitoring.'', N''Sticky Card (Blue)''),
    (''a0000000-0000-0000-0000-000000000006'', N''Red adhesive card used to attract leafhoppers.'', N''Sticky Card (Red)''),
    (''a0000000-0000-0000-0000-000000000007'', N''Container buried flush with the ground surface to capture crawling insects like ground beetles and earwigs.'', N''Pitfall Trap''),
    (''a0000000-0000-0000-0000-000000000008'', N''UV or blacklight lamp with a collection container below, attracting night-flying moths and beetles.'', N''Light Trap''),
    (''a0000000-0000-0000-0000-000000000009'', N''Lynfield or McPhail style trap with liquid lure (e.g., torula yeast or pheromone) for monitoring Mediterranean fruit flies and olive flies.'', N''Fruit Fly Trap''),
    (''a0000000-0000-0000-0000-00000000000a'', N''Red, sphere-shaped sticky trap that mimics ripe fruit, used in orchards for fruit worms and apple maggot.'', N''Red Ball Trap''),
    (''a0000000-0000-0000-0000-00000000000b'', N''A digital trap equipped with a camera and connectivity for remote image capture and automated pest counting.'', N''Smart / Automated Trap'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Description', N'Name') AND [object_id] = OBJECT_ID(N'[TrapTypes]'))
        SET IDENTITY_INSERT [TrapTypes] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125017_SeedDefaultTrapTypes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260329125017_SeedDefaultTrapTypes', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD [UpdatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000001'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000002'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000003'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000004'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000005'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000006'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000007'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000008'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000009'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-00000000000a'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedAt] = ''2025-01-01T00:00:00.0000000Z'', [UpdatedAt] = ''2025-01-01T00:00:00.0000000Z''
    WHERE [Id] = ''a0000000-0000-0000-0000-00000000000b'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329125846_AddTimestampsToTrapTypes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260329125846_AddTimestampsToTrapTypes', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    DROP INDEX [IX_TrapTypes_Name] ON [TrapTypes];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TrapTypes]') AND [c].[name] = N'UpdatedAt');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [TrapTypes] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [TrapTypes] ALTER COLUMN [UpdatedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD [DeletedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000001'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000002'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000003'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000004'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000005'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000006'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000007'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000008'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000009'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-00000000000a'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [DeletedAt] = NULL, [UpdatedAt] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-00000000000b'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_TrapTypes_Name] ON [TrapTypes] ([Name]) WHERE [DeletedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260329130618_SoftDeleteAndNullableUpdatedAtForTrapTypes', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331104622_AddTrapsTable'
)
BEGIN
    ALTER TABLE [PestObservations] ADD [TrapId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331104622_AddTrapsTable'
)
BEGIN
    CREATE TABLE [Traps] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Barcode] nvarchar(200) NULL,
        [TrapTypeId] uniqueidentifier NULL,
        [MonitoringPointId] uniqueidentifier NULL,
        [Latitude] float NULL,
        [Longitude] float NULL,
        [IsEnabled] bit NOT NULL,
        [Notes] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Traps] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Traps_MonitoringPoints_MonitoringPointId] FOREIGN KEY ([MonitoringPointId]) REFERENCES [MonitoringPoints] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_Traps_TrapTypes_TrapTypeId] FOREIGN KEY ([TrapTypeId]) REFERENCES [TrapTypes] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331104622_AddTrapsTable'
)
BEGIN
    CREATE INDEX [IX_PestObservations_TrapId] ON [PestObservations] ([TrapId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331104622_AddTrapsTable'
)
BEGIN
    CREATE INDEX [IX_Traps_MonitoringPointId] ON [Traps] ([MonitoringPointId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331104622_AddTrapsTable'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Traps_TenantId_Barcode] ON [Traps] ([TenantId], [Barcode]) WHERE [DeletedAt] IS NULL AND [Barcode] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331104622_AddTrapsTable'
)
BEGIN
    CREATE INDEX [IX_Traps_TrapTypeId] ON [Traps] ([TrapTypeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331104622_AddTrapsTable'
)
BEGIN
    ALTER TABLE [PestObservations] ADD CONSTRAINT [FK_PestObservations_Traps_TrapId] FOREIGN KEY ([TrapId]) REFERENCES [Traps] ([Id]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331104622_AddTrapsTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260331104622_AddTrapsTable', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331131741_AddTemperatureUnitPreference'
)
BEGIN
    ALTER TABLE [Users] ADD [TemperatureUnit] nvarchar(1) NOT NULL DEFAULT N'C';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331131741_AddTemperatureUnitPreference'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260331131741_AddTemperatureUnitPreference', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331135327_AddTemperatureCelsiusToScoutingSession'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [TemperatureCelsius] float NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260331135327_AddTemperatureCelsiusToScoutingSession'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260331135327_AddTemperatureCelsiusToScoutingSession', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ScoutingSessions]') AND [c].[name] = N'StartedAt');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [ScoutingSessions] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [ScoutingSessions] ALTER COLUMN [StartedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ScoutingSessions]') AND [c].[name] = N'ScouterId');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [ScoutingSessions] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [ScoutingSessions] ALTER COLUMN [ScouterId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [IsPlanned] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [ScheduledDate] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    CREATE TABLE [SessionObservations] (
        [Id] uniqueidentifier NOT NULL,
        [TenantId] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [ObservationType] nvarchar(50) NOT NULL,
        [IsPlanned] bit NOT NULL,
        [TrapId] uniqueidentifier NULL,
        [PestId] uniqueidentifier NULL,
        [CaptureMode] nvarchar(50) NULL,
        [SortOrder] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SessionObservations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SessionObservations_Pests_PestId] FOREIGN KEY ([PestId]) REFERENCES [Pests] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_SessionObservations_ScoutingSessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [ScoutingSessions] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SessionObservations_Traps_TrapId] FOREIGN KEY ([TrapId]) REFERENCES [Traps] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_PestId] ON [SessionObservations] ([PestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_SessionId] ON [SessionObservations] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_TrapId] ON [SessionObservations] ([TrapId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401143651_AddSessionObservationConsolidated'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260401143651_AddSessionObservationConsolidated', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401145943_AddSessionObservationResultFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [Count] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401145943_AddSessionObservationResultFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [IsPresent] bit NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401145943_AddSessionObservationResultFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [IsUnknownPest] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401145943_AddSessionObservationResultFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [Latitude] float NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401145943_AddSessionObservationResultFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [LifeStage] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401145943_AddSessionObservationResultFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [Longitude] float NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401145943_AddSessionObservationResultFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [Notes] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401145943_AddSessionObservationResultFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260401145943_AddSessionObservationResultFields', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260402062045_RemoveMonitoringPointsAndPestObservations'
)
BEGIN
    ALTER TABLE [Traps] DROP CONSTRAINT [FK_Traps_MonitoringPoints_MonitoringPointId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260402062045_RemoveMonitoringPointsAndPestObservations'
)
BEGIN
    DROP TABLE [MonitoringPointPests];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260402062045_RemoveMonitoringPointsAndPestObservations'
)
BEGIN
    DROP TABLE [PestObservations];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260402062045_RemoveMonitoringPointsAndPestObservations'
)
BEGIN
    DROP TABLE [MonitoringPoints];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260402062045_RemoveMonitoringPointsAndPestObservations'
)
BEGIN
    DROP INDEX [IX_Traps_MonitoringPointId] ON [Traps];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260402062045_RemoveMonitoringPointsAndPestObservations'
)
BEGIN
    DECLARE @var4 nvarchar(max);
    SELECT @var4 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Traps]') AND [c].[name] = N'MonitoringPointId');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [Traps] DROP CONSTRAINT ' + @var4 + ';');
    ALTER TABLE [Traps] DROP COLUMN [MonitoringPointId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260402062045_RemoveMonitoringPointsAndPestObservations'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [PhotoUrlsJson] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260402062045_RemoveMonitoringPointsAndPestObservations'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260402062045_RemoveMonitoringPointsAndPestObservations', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403105852_AddObservationGroupId'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [ObservationGroupId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403105852_AddObservationGroupId'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260403105852_AddObservationGroupId', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403150258_AddTrapFieldId'
)
BEGIN
    ALTER TABLE [Traps] ADD [FieldId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403150258_AddTrapFieldId'
)
BEGIN
    CREATE INDEX [IX_Traps_FieldId] ON [Traps] ([FieldId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403150258_AddTrapFieldId'
)
BEGIN
    ALTER TABLE [Traps] ADD CONSTRAINT [FK_Traps_Fields_FieldId] FOREIGN KEY ([FieldId]) REFERENCES [Fields] ([Id]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403150258_AddTrapFieldId'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260403150258_AddTrapFieldId', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403190336_AddScoutingSessionFieldId'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [FieldId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403190336_AddScoutingSessionFieldId'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_FieldId] ON [ScoutingSessions] ([FieldId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403190336_AddScoutingSessionFieldId'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD CONSTRAINT [FK_ScoutingSessions_Fields_FieldId] FOREIGN KEY ([FieldId]) REFERENCES [Fields] ([Id]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260403190336_AddScoutingSessionFieldId'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260403190336_AddScoutingSessionFieldId', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD [CreatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD [DeletedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD [UpdatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Traps] ADD [CreatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Traps] ADD [DeletedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Traps] ADD [UpdatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [CreatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [DeletedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [UpdatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [CreatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [DeletedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [UpdatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Pests] ADD [CreatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Pests] ADD [DeletedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Pests] ADD [UpdatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Fields] ADD [CreatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Fields] ADD [DeletedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Fields] ADD [UpdatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Farms] ADD [CreatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Farms] ADD [DeletedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Farms] ADD [UpdatedByUserId] nvarchar(450) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000001'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000002'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000003'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000004'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000005'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000006'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000007'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000008'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-000000000009'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-00000000000a'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    EXEC(N'UPDATE [TrapTypes] SET [CreatedByUserId] = NULL, [DeletedByUserId] = NULL, [UpdatedByUserId] = NULL
    WHERE [Id] = ''a0000000-0000-0000-0000-00000000000b'';
    SELECT @@ROWCOUNT');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_TrapTypes_CreatedByUserId] ON [TrapTypes] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_TrapTypes_DeletedByUserId] ON [TrapTypes] ([DeletedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_TrapTypes_UpdatedByUserId] ON [TrapTypes] ([UpdatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Traps_CreatedByUserId] ON [Traps] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Traps_DeletedByUserId] ON [Traps] ([DeletedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Traps_UpdatedByUserId] ON [Traps] ([UpdatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_CreatedByUserId] ON [SessionObservations] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_DeletedByUserId] ON [SessionObservations] ([DeletedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_UpdatedByUserId] ON [SessionObservations] ([UpdatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_CreatedByUserId] ON [ScoutingSessions] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_DeletedByUserId] ON [ScoutingSessions] ([DeletedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_UpdatedByUserId] ON [ScoutingSessions] ([UpdatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Pests_CreatedByUserId] ON [Pests] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Pests_DeletedByUserId] ON [Pests] ([DeletedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Pests_UpdatedByUserId] ON [Pests] ([UpdatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Fields_CreatedByUserId] ON [Fields] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Fields_DeletedByUserId] ON [Fields] ([DeletedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Fields_UpdatedByUserId] ON [Fields] ([UpdatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Farms_CreatedByUserId] ON [Farms] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Farms_DeletedByUserId] ON [Farms] ([DeletedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    CREATE INDEX [IX_Farms_UpdatedByUserId] ON [Farms] ([UpdatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Farms] ADD CONSTRAINT [FK_Farms_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Farms] ADD CONSTRAINT [FK_Farms_Users_DeletedByUserId] FOREIGN KEY ([DeletedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Farms] ADD CONSTRAINT [FK_Farms_Users_UpdatedByUserId] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Fields] ADD CONSTRAINT [FK_Fields_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Fields] ADD CONSTRAINT [FK_Fields_Users_DeletedByUserId] FOREIGN KEY ([DeletedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Fields] ADD CONSTRAINT [FK_Fields_Users_UpdatedByUserId] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Pests] ADD CONSTRAINT [FK_Pests_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Pests] ADD CONSTRAINT [FK_Pests_Users_DeletedByUserId] FOREIGN KEY ([DeletedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Pests] ADD CONSTRAINT [FK_Pests_Users_UpdatedByUserId] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD CONSTRAINT [FK_ScoutingSessions_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD CONSTRAINT [FK_ScoutingSessions_Users_DeletedByUserId] FOREIGN KEY ([DeletedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD CONSTRAINT [FK_ScoutingSessions_Users_UpdatedByUserId] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD CONSTRAINT [FK_SessionObservations_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD CONSTRAINT [FK_SessionObservations_Users_DeletedByUserId] FOREIGN KEY ([DeletedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD CONSTRAINT [FK_SessionObservations_Users_UpdatedByUserId] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Traps] ADD CONSTRAINT [FK_Traps_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Traps] ADD CONSTRAINT [FK_Traps_Users_DeletedByUserId] FOREIGN KEY ([DeletedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [Traps] ADD CONSTRAINT [FK_Traps_Users_UpdatedByUserId] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD CONSTRAINT [FK_TrapTypes_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD CONSTRAINT [FK_TrapTypes_Users_DeletedByUserId] FOREIGN KEY ([DeletedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    ALTER TABLE [TrapTypes] ADD CONSTRAINT [FK_TrapTypes_Users_UpdatedByUserId] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260404090933_AddUserAuditFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260404090933_AddUserAuditFields', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260405092259_AddScoutingSessionFarmId'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD [FarmId] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260405092259_AddScoutingSessionFarmId'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_FarmId] ON [ScoutingSessions] ([FarmId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260405092259_AddScoutingSessionFarmId'
)
BEGIN
    ALTER TABLE [ScoutingSessions] ADD CONSTRAINT [FK_ScoutingSessions_Farms_FarmId] FOREIGN KEY ([FarmId]) REFERENCES [Farms] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260405092259_AddScoutingSessionFarmId'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260405092259_AddScoutingSessionFarmId', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406154858_AddThresholdCountToObservations'
)
BEGIN
    ALTER TABLE [SessionObservations] ADD [ThresholdCount] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260406154858_AddThresholdCountToObservations'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260406154858_AddThresholdCountToObservations', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    DROP INDEX [IX_ScoutingSessions_TenantId] ON [ScoutingSessions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    DROP INDEX [IX_Farms_TenantId] ON [Farms];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    CREATE INDEX [IX_Traps_TenantId_DeletedAt] ON [Traps] ([TenantId], [DeletedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_TenantId] ON [SessionObservations] ([TenantId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_TenantId_CreatedAt] ON [ScoutingSessions] ([TenantId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    CREATE INDEX [IX_ScoutingSessions_TenantId_DeletedAt] ON [ScoutingSessions] ([TenantId], [DeletedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    CREATE INDEX [IX_Fields_TenantId_DeletedAt] ON [Fields] ([TenantId], [DeletedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    CREATE INDEX [IX_Farms_TenantId_DeletedAt] ON [Farms] ([TenantId], [DeletedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260408180538_AddPerformanceIndexes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260408180538_AddPerformanceIndexes', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260502162355_AddSessionObservationSessionIdObservationTypeIndex'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_SessionId_ObservationType] ON [SessionObservations] ([SessionId], [ObservationType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260502162355_AddSessionObservationSessionIdObservationTypeIndex'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260502162355_AddSessionObservationSessionIdObservationTypeIndex', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260508063951_AddSessionObservationCreatedAtIndex'
)
BEGIN
    CREATE INDEX [IX_SessionObservations_TenantId_CreatedAt] ON [SessionObservations] ([TenantId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260508063951_AddSessionObservationCreatedAtIndex'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260508063951_AddSessionObservationCreatedAtIndex', N'10.0.5');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260513063424_AddFieldLatitudeLongitude'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260513063424_AddFieldLatitudeLongitude', N'10.0.5');
END;

COMMIT;
GO

