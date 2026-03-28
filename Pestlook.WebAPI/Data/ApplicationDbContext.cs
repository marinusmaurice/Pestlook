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
    public DbSet<MonitoringPoint> MonitoringPoints => Set<MonitoringPoint>();
    public DbSet<Pest> Pests => Set<Pest>();
    public DbSet<MonitoringPointPest> MonitoringPointPests => Set<MonitoringPointPest>();
    public DbSet<Observation> Observations => Set<Observation>();
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
        });

        builder.Entity<ApplicationUser>(e =>
        {
            e.HasOne(u => u.Tenant)
             .WithMany(t => t.Users)
             .HasForeignKey(u => u.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.Property(u => u.FirstName).HasMaxLength(100);
            e.Property(u => u.LastName).HasMaxLength(100);
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

        builder.Entity<Farm>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.Name).HasMaxLength(200).IsRequired();
            e.Property(f => f.Address).HasMaxLength(500);
            e.HasOne(f => f.Tenant)
             .WithMany(t => t.Farms)
             .HasForeignKey(f => f.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(f => f.DeletedAt == null &&
                (tenantContext.TenantId == null || f.TenantId == tenantContext.TenantId));
        });

        builder.Entity<Field>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.Name).HasMaxLength(200).IsRequired();
            e.Property(f => f.CropType).HasMaxLength(100);
            e.HasOne(f => f.Farm)
             .WithMany(fm => fm.Fields)
             .HasForeignKey(f => f.FarmId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasQueryFilter(f => f.DeletedAt == null &&
                (tenantContext.TenantId == null || f.TenantId == tenantContext.TenantId));
        });

        builder.Entity<MonitoringPoint>(e =>
        {
            e.HasKey(mp => mp.Id);
            e.Property(mp => mp.Name).HasMaxLength(200);
            e.Property(mp => mp.TrapType).HasMaxLength(100);
            e.Property(mp => mp.PointType)
             .HasConversion<string>()
             .HasMaxLength(50)
             .IsRequired();
            e.HasOne(mp => mp.Field)
             .WithMany(f => f.MonitoringPoints)
             .HasForeignKey(mp => mp.FieldId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(mp => mp.CreatedBy)
             .WithMany()
             .HasForeignKey(mp => mp.CreatedByUserId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(mp => mp.DeletedAt == null &&
                (tenantContext.TenantId == null || mp.TenantId == tenantContext.TenantId));
        });

        builder.Entity<Pest>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Name).HasMaxLength(200).IsRequired();
            e.Property(p => p.ScientificName).HasMaxLength(300);
            e.Property(p => p.Category)
             .HasConversion<string>()
             .HasMaxLength(50);
            e.HasOne(p => p.Tenant)
             .WithMany()
             .HasForeignKey(p => p.TenantId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(p => new { p.TenantId, p.Name }).IsUnique()
             .HasFilter("[DeletedAt] IS NULL");
            e.HasQueryFilter(p => p.DeletedAt == null &&
                (tenantContext.TenantId == null || p.TenantId == tenantContext.TenantId));
        });

        builder.Entity<MonitoringPointPest>(e =>
        {
            e.HasKey(mpp => mpp.Id);
            e.HasOne(mpp => mpp.MonitoringPoint)
             .WithMany(mp => mp.MonitoringPointPests)
             .HasForeignKey(mpp => mpp.MonitoringPointId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(mpp => mpp.Pest)
             .WithMany(p => p.MonitoringPointPests)
             .HasForeignKey(mpp => mpp.PestId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(mpp => new { mpp.MonitoringPointId, mpp.PestId }).IsUnique();
        });

        builder.Entity<Observation>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.PestNameText).HasMaxLength(200);
            e.Property(o => o.LifeStage).HasMaxLength(100);
            e.HasOne(o => o.MonitoringPoint)
             .WithMany(mp => mp.Observations)
             .HasForeignKey(o => o.MonitoringPointId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.Scout)
             .WithMany()
             .HasForeignKey(o => o.ScoutUserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.Pest)
             .WithMany()
             .HasForeignKey(o => o.PestId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(o => new { o.MonitoringPointId, o.ObservedAt });
            e.HasQueryFilter(o => tenantContext.TenantId == null || o.TenantId == tenantContext.TenantId);
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

        // Clean up Identity table names
        builder.Entity<ApplicationUser>().ToTable("Users");
        builder.Entity<IdentityRole>().ToTable("Roles");
        builder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
        builder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
        builder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");
        builder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
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
