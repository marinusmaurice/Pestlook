DECLARE @TenantId UNIQUEIDENTIFIER = '7AF655B6-B2FC-4703-8EA8-D429C3127957';

-- 1. Observations (deepest leaf — FK to Sessions/Traps/Pests)
DELETE FROM SessionObservations WHERE TenantId = @TenantId;

-- 2. Sessions
DELETE FROM ScoutingSessions WHERE TenantId = @TenantId;

-- 3. Traps
DELETE FROM Traps WHERE TenantId = @TenantId;

-- 4. Fields
DELETE FROM Fields WHERE TenantId = @TenantId;

-- 5. Farms
DELETE FROM Farms WHERE TenantId = @TenantId;

-- 6. Saved reports
DELETE FROM SavedReports WHERE TenantId = @TenantId;

-- 7. Feedback
DELETE FROM Feedback WHERE TenantId = @TenantId;

-- 8. Billing snapshots
DELETE FROM BillingSnapshots WHERE TenantId = @TenantId;

-- 9. Pests
DELETE FROM Pests WHERE TenantId = @TenantId;

-- 10. Custom trap types (system ones have TenantId = NULL — leave those alone)
DELETE FROM TrapTypes WHERE TenantId = @TenantId;

-- 11. Identity tables for this tenant's users
DECLARE @UserIds TABLE (Id NVARCHAR(450));
INSERT INTO @UserIds SELECT Id FROM Users WHERE TenantId = @TenantId;

DELETE FROM UserTokens  WHERE UserId IN (SELECT Id FROM @UserIds);
DELETE FROM UserLogins  WHERE UserId IN (SELECT Id FROM @UserIds);
DELETE FROM UserClaims  WHERE UserId IN (SELECT Id FROM @UserIds);
DELETE FROM UserRoles   WHERE UserId IN (SELECT Id FROM @UserIds);
DELETE FROM RefreshTokens WHERE TenantId = @TenantId;

-- 12. Users
DELETE FROM Users WHERE TenantId = @TenantId;

-- 13. Audit logs
DELETE FROM AuditLogs WHERE TenantId = @TenantId;

-- 14. The tenant itself
DELETE FROM Tenants WHERE Id = @TenantId;