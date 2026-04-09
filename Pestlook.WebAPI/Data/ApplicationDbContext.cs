using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Data;

public sealed class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options,
    ITenantContext tenantContext,
    ICurrentUserService currentUserService,
    IHttpContextAccessor httpContextAccessor)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ExceptionLog> ExceptionLogs => Set<ExceptionLog>();
    public DbSet<Farm> Farms => Set<Farm>();
    public DbSet<Field> Fields => Set<Field>();
    public DbSet<TrapType> TrapTypes => Set<TrapType>();
    public DbSet<Pest> Pests => Set<Pest>();
    public DbSet<ScoutingSession> ScoutingSessions => Set<ScoutingSession>();
    public DbSet<Trap> Traps => Set<Trap>();
    public DbSet<SessionObservation> SessionObservations => Set<SessionObservation>();
    public DbSet<BillingSnapshot> BillingSnapshots => Set<BillingSnapshot>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Tenant>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.Slug).IsUnique();
            e.Property(t => t.Name).HasMaxLength(200).IsRequired();
            e.Property(t => t.Slug).HasMaxLength(100).IsRequired();
            e.Property(t => t.SubscriptionPlan).HasConversion<string>().HasMaxLength(50);
        });

        builder.Entity<ApplicationUser>(e =>
        {
            e.HasOne(u => u.Tenant)
             .WithMany(t => t.Users)
             .HasForeignKey(u => u.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.Property(u => u.FirstName).HasMaxLength(100);
            e.Property(u => u.LastName).HasMaxLength(100);
            e.Property(u => u.TemperatureUnit).HasMaxLength(1).HasDefaultValue("C");
            e.HasQueryFilter(u => tenantContext.TenantId == null || u.TenantId == tenantContext.TenantId);
        });

        builder.Entity<RefreshToken>(e =>
        {
            e.HasKey(rt => rt.Id);
            e.HasOne(rt => rt.User)
             .WithMany(u => u.RefreshTokens)
             .HasForeignKey(rt => rt.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(rt => rt.Token).IsUnique();
            e.HasQueryFilter(rt => tenantContext.TenantId == null || rt.TenantId == tenantContext.TenantId);
            e.Property(rt => rt.Token).HasMaxLength(500);
        });

        builder.Entity<AuditLog>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.EntityName).HasMaxLength(200);
            e.Property(a => a.Action).HasMaxLength(50);
            e.Property(a => a.IpAddress).HasMaxLength(50);
        });

        builder.Entity<ExceptionLog>(e =>
        {
            e.HasKey(ex => ex.Id);
            e.Property(ex => ex.RequestPath).HasMaxLength(500);
            e.Property(ex => ex.RequestMethod).HasMaxLength(10);
        });

        // Clean up Identity table names
        builder.Entity<ApplicationUser>().ToTable("Users");
        builder.Entity<IdentityRole>().ToTable("Roles");
        builder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
        builder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
        builder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");
        builder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");

        // ── Domain model ─────────────────────────────────────────────────────

        builder.Entity<Farm>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.Name).HasMaxLength(200).IsRequired();
            e.Property(f => f.Address).HasMaxLength(500);
            e.HasOne(f => f.Tenant)
             .WithMany(t => t.Farms)
             .HasForeignKey(f => f.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(f => new { f.TenantId, f.DeletedAt });
            e.HasQueryFilter(f => f.DeletedAt == null &&
                (tenantContext.TenantId == null || f.TenantId == tenantContext.TenantId));
        });

        builder.Entity<Field>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.Name).HasMaxLength(200).IsRequired();
            e.Property(f => f.CropType).HasMaxLength(100);
            e.Property(f => f.Season).HasMaxLength(100);
            e.HasOne(f => f.Farm)
             .WithMany(fm => fm.Fields)
             .HasForeignKey(f => f.FarmId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(f => new { f.TenantId, f.DeletedAt });
            e.HasIndex(f => f.FarmId);
            e.HasQueryFilter(f => f.DeletedAt == null &&
                (tenantContext.TenantId == null || f.TenantId == tenantContext.TenantId));
        });

        builder.Entity<TrapType>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Name).HasMaxLength(100).IsRequired();
            e.Property(t => t.Description).HasMaxLength(500);
            e.HasIndex(t => t.Name).IsUnique()
             .HasFilter("[DeletedAt] IS NULL");
            e.HasQueryFilter(t => t.DeletedAt == null);

            var seedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            e.HasData(
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000001"), Name = "Delta Trap", Description = "Triangular tent-shaped trap with a sticky inner surface, typically baited with pheromone lures to attract and capture moths.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000002"), Name = "Bucket Trap", Description = "Container-style trap with a funnel lid; pests fall into the bucket and cannot escape, often used with pheromones or kill strips.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000003"), Name = "Cone Trap", Description = "Cone-shaped mesh or wire trap with a collection chamber at the top, designed for strong-flying moths like corn earworm.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000004"), Name = "Sticky Card (Yellow)", Description = "Yellow adhesive card used to attract and trap flying insects such as aphids, whiteflies, and leafminers.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000005"), Name = "Sticky Card (Blue)", Description = "Blue adhesive card specifically effective for thrips monitoring.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000006"), Name = "Sticky Card (Red)", Description = "Red adhesive card used to attract leafhoppers.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000007"), Name = "Pitfall Trap", Description = "Container buried flush with the ground surface to capture crawling insects like ground beetles and earwigs.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000008"), Name = "Light Trap", Description = "UV or blacklight lamp with a collection container below, attracting night-flying moths and beetles.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-000000000009"), Name = "Fruit Fly Trap", Description = "Lynfield or McPhail style trap with liquid lure (e.g., torula yeast or pheromone) for monitoring Mediterranean fruit flies and olive flies.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-00000000000a"), Name = "Red Ball Trap", Description = "Red, sphere-shaped sticky trap that mimics ripe fruit, used in orchards for fruit worms and apple maggot.", CreatedAt = seedDate },
                new TrapType { Id = Guid.Parse("a0000000-0000-0000-0000-00000000000b"), Name = "Smart / Automated Trap", Description = "A digital trap equipped with a camera and connectivity for remote image capture and automated pest counting.", CreatedAt = seedDate }
            );
        });

        builder.Entity<Pest>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.CommonName).HasMaxLength(200).IsRequired();
            e.Property(p => p.ScientificName).HasMaxLength(300);
            e.Property(p => p.Description).HasMaxLength(1000);
            e.Property(p => p.ImageUrl).HasMaxLength(500);
            e.Property(p => p.Category).HasConversion<string>().HasMaxLength(50);
            e.Property(p => p.DefaultCaptureMode).HasConversion<string>().HasMaxLength(50);
            e.HasOne(p => p.Tenant)
             .WithMany()
             .HasForeignKey(p => p.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(p => new { p.TenantId, p.CommonName }).IsUnique()
             .HasFilter("[DeletedAt] IS NULL");
            e.HasQueryFilter(p => p.DeletedAt == null &&
                (tenantContext.TenantId == null || p.TenantId == tenantContext.TenantId));
        });

        builder.Entity<ScoutingSession>(e =>
        {
            e.HasKey(ss => ss.Id);
            e.Property(ss => ss.WeatherConditions).HasMaxLength(200);
            e.Property(ss => ss.Notes).HasMaxLength(1000);
            e.HasOne(ss => ss.Tenant)
             .WithMany(t => t.ScoutingSessions)
             .HasForeignKey(ss => ss.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ss => ss.Scouter)
             .WithMany()
             .HasForeignKey(ss => ss.ScouterId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ss => ss.Field)
             .WithMany()
             .HasForeignKey(ss => ss.FieldId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(ss => ss.Farm)
             .WithMany()
             .HasForeignKey(ss => ss.FarmId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(ss => ss.CreatedBy)
             .WithMany()
             .HasForeignKey(ss => ss.CreatedByUserId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(ss => ss.UpdatedBy)
             .WithMany()
             .HasForeignKey(ss => ss.UpdatedByUserId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ApplicationUser>()
             .WithMany()
             .HasForeignKey(ss => ss.DeletedByUserId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasQueryFilter(ss => ss.DeletedAt == null &&
                (tenantContext.TenantId == null || ss.TenantId == tenantContext.TenantId));
            e.HasIndex(ss => new { ss.TenantId, ss.DeletedAt });
            e.HasIndex(ss => new { ss.TenantId, ss.CreatedAt });
            e.HasIndex(ss => ss.ScouterId);
        });

        builder.Entity<SessionObservation>(e =>
        {
            e.HasKey(so => so.Id);
            e.Property(so => so.ObservationType).HasConversion<string>().HasMaxLength(50);
            e.Property(so => so.CaptureMode).HasConversion<string>().HasMaxLength(50);
            e.Property(so => so.LifeStage).HasConversion<string>().HasMaxLength(50);
            e.Property(so => so.Notes).HasMaxLength(1000);
            e.Property(so => so.PhotoUrlsJson).HasMaxLength(2000);
            e.HasOne(so => so.Session)
             .WithMany(ss => ss.SessionObservations)
             .HasForeignKey(so => so.SessionId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(so => so.Trap)
             .WithMany()
             .HasForeignKey(so => so.TrapId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(so => so.Pest)
             .WithMany()
             .HasForeignKey(so => so.PestId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(so => so.CreatedBy)
             .WithMany()
             .HasForeignKey(so => so.CreatedByUserId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(so => so.UpdatedBy)
             .WithMany()
             .HasForeignKey(so => so.UpdatedByUserId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ApplicationUser>()
             .WithMany()
             .HasForeignKey(so => so.DeletedByUserId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasQueryFilter(so => tenantContext.TenantId == null || so.TenantId == tenantContext.TenantId);
            e.HasIndex(so => so.SessionId);
            e.HasIndex(so => so.TenantId);
        });

        builder.Entity<Trap>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Name).HasMaxLength(200).IsRequired();
            e.Property(t => t.Barcode).HasMaxLength(200);
            e.Property(t => t.Notes).HasMaxLength(1000);
            e.HasIndex(t => new { t.TenantId, t.Barcode }).IsUnique()
             .HasFilter("[DeletedAt] IS NULL AND [Barcode] IS NOT NULL");
            e.HasIndex(t => new { t.TenantId, t.DeletedAt });
            e.HasOne(t => t.TrapType)
             .WithMany()
             .HasForeignKey(t => t.TrapTypeId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.Field)
             .WithMany()
             .HasForeignKey(t => t.FieldId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(t => t.DeletedAt == null &&
                (tenantContext.TenantId == null || t.TenantId == tenantContext.TenantId));
        });

        builder.Entity<BillingSnapshot>(e =>
        {
            e.HasKey(b => b.Id);
            e.Property(b => b.Status).HasMaxLength(20).IsRequired();
            e.HasOne(b => b.Tenant)
             .WithMany(t => t.BillingSnapshots)
             .HasForeignKey(b => b.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(b => b.Owner)
             .WithMany()
             .HasForeignKey(b => b.OwnerId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(b => new { b.TenantId, b.BillingMonth }).IsUnique();
            e.HasQueryFilter(b => tenantContext.TenantId == null || b.TenantId == tenantContext.TenantId);
        });

        // ── User audit FK configuration ──────────────────────────────────────
        ConfigureUserAudit<Farm>(builder);
        ConfigureUserAudit<Field>(builder);
        ConfigureUserAudit<Trap>(builder);
        ConfigureUserAudit<TrapType>(builder);
        ConfigureUserAudit<Pest>(builder);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetUserAuditFields();
        var auditEntries = BuildAuditEntries();
        var result = await base.SaveChangesAsync(cancellationToken);
        await SaveAuditLogsAsync(auditEntries, cancellationToken);
        return result;
    }

    private List<PendingAuditEntry> BuildAuditEntries()
    {
        ChangeTracker.DetectChanges();
        var entries = new List<PendingAuditEntry>();

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog or ExceptionLog)
                continue;

            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
                continue;

            entries.Add(new PendingAuditEntry
            {
                EntityName = entry.Entity.GetType().Name,
                Action = entry.State.ToString(),
                TenantId = tenantContext.TenantId,
                UserId = currentUserService.UserId,
                IpAddress = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
                EntityId = GetEntityId(entry),
                OldValues = entry.State == EntityState.Added
                    ? null
                    : JsonSerializer.Serialize(
                        entry.Properties
                             .Where(p => !p.IsTemporary)
                             .ToDictionary(p => p.Metadata.Name, p => p.OriginalValue)),
                NewValues = entry.State == EntityState.Deleted
                    ? null
                    : JsonSerializer.Serialize(
                        entry.Properties
                             .Where(p => !p.IsTemporary)
                             .ToDictionary(p => p.Metadata.Name, p => p.CurrentValue))
            });
        }

        return entries;
    }

    private static string? GetEntityId(EntityEntry entry)
    {
        var keys = entry.Properties.Where(p => p.Metadata.IsPrimaryKey()).ToList();
        return keys.Count == 0 ? null : string.Join(",", keys.Select(p => p.CurrentValue?.ToString()));
    }

    private async Task SaveAuditLogsAsync(List<PendingAuditEntry> entries, CancellationToken ct)
    {
        if (entries.Count == 0) return;

        await AuditLogs.AddRangeAsync(
            entries.Select(e => new AuditLog
            {
                TenantId = e.TenantId,
                UserId = e.UserId,
                EntityName = e.EntityName,
                EntityId = e.EntityId,
                Action = e.Action,
                OldValues = e.OldValues,
                NewValues = e.NewValues,
                IpAddress = e.IpAddress
            }),
            ct);

        await base.SaveChangesAsync(ct);
    }

    private void SetUserAuditFields()
    {
        var userId = currentUserService.UserId;
        foreach (var entry in ChangeTracker.Entries<IAuditableByUser>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedByUserId = userId;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedByUserId = userId;
                var deletedAtMeta = entry.Metadata.FindProperty("DeletedAt");
                if (deletedAtMeta != null)
                {
                    var deletedAtProp = entry.Property(deletedAtMeta.Name);
                    if (deletedAtProp.IsModified && deletedAtProp.OriginalValue is null && deletedAtProp.CurrentValue is not null)
                        entry.Entity.DeletedByUserId = userId;
                }
            }
        }
    }

    private static void ConfigureUserAudit<TEntity>(ModelBuilder builder) where TEntity : class, IAuditableByUser
    {
        builder.Entity<TEntity>(e =>
        {
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CreatedByUserId).IsRequired(false).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UpdatedByUserId).IsRequired(false).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.DeletedByUserId).IsRequired(false).OnDelete(DeleteBehavior.NoAction);
        });
    }

    private sealed class PendingAuditEntry
    {
        public Guid? TenantId { get; set; }
        public string? UserId { get; set; }
        public string EntityName { get; set; } = string.Empty;
        public string? EntityId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
    }
}
