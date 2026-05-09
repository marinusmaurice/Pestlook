# Pestlook — Outstanding Work

> Priority: 🔴 High · 🟡 Medium · 🟢 Low / Nice to have

---

## 💳 Payments & Billing

- 🔴 **Stripe integration** — wire up Stripe Checkout / Billing to replace the manual `BillingSnapshotsController.Generate` endpoint. The snapshot model and pricing logic (`activePointCount × 500` cents) already exists; it just needs a real payment processor behind it.
- 🔴 **Stripe webhooks** — handle `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` events to automatically update `BillingSnapshot.Status` and suspend access on non-payment.
- 🔴 **Subscription enforcement** — block API calls (return `402 Payment Required`) when a tenant's subscription is lapsed or quota is exceeded. Currently the quota is tracked but never enforced.
- 🟡 **Automatic monthly snapshot generation** — replace the manual POST `/billing-snapshots/generate` with a scheduled background job (e.g. .NET `IHostedService` or Hangfire) that runs on the 1st of each month.
- 🟡 **Customer portal link** — expose a Stripe Customer Portal URL in the Billing tab so admins can update their payment method, download invoices, and manage their plan without contacting support.
- 🟢 **Plan tiers** — the `Tenant` entity has no `PlanTier` field yet. Define tiers (Starter / Pro / Enterprise) with different trap quota limits.

---

## 📧 Email

- 🔴 **Transactional email service** — no `IEmailService` implementation exists. Add SendGrid (or MailKit + SMTP) and wire it up for all the flows below.
- 🔴 **Password reset / forgot password** — the `AuthController` and `AuthService` have no `ForgotPassword` or `ResetPassword` endpoints. ASP.NET Identity supports this out of the box once an email sender is registered.
- 🔴 **Email confirmation on signup** — new accounts are activated immediately without verifying the email address. Add `RequireConfirmedEmail = true` and send a confirmation link on registration.
- 🔴 **Team member invitation** — currently admins set a password manually. Replace this with an invite-by-email flow: generate a one-time token, email the link, recipient sets their own password.
- 🟡 **Threshold breach alerts** — the Settings page has a toggle for email notifications but there is no background job or event handler that actually sends them. Hook into the observation save pipeline to fire an alert when `Count > ThresholdCount`.
- 🟡 **Weekly digest** — a scheduled email summarising the week's session counts, top breaches, and coverage gaps per farm.
- 🟡 **Overdue session reminders** — email (or push) a scout and their supervisor when a planned session passes its scheduled date without being started.

---

## 📸 Photo Upload & Storage

- 🔴 **Server-side photo storage** — the mobile app stores photos in a local SQLite table (`LocalObservationPhoto`) and the observation detail page shows them, but there is no upload pipeline to the server. Photos never leave the device.
- 🔴 **Upload endpoint** — add `POST /api/v1/observations/{id}/photos` that accepts a multipart file, saves to blob storage (Azure Blob Storage / AWS S3 / Cloudflare R2), and stores the public URL in `SessionObservation.PhotoUrlsJson`.
- 🔴 **Mobile upload on sync** — after a session is synced, iterate any `LocalObservationPhoto` rows for that session and upload them via the new endpoint, then delete the local copies.
- 🟡 **Web photo viewer** — the web observation grids show a photo count badge but there is no lightbox or viewer. Add an inline photo carousel or modal on the session detail / unknown pests pages.
- 🟡 **Photo compression** — compress images on the mobile side before upload (target ≤ 1 MB per photo) to reduce storage costs and upload time in the field.
- 🟢 **Photo CDN / signed URLs** — serve photos via a CDN with short-lived signed URLs rather than public blob URLs to prevent hotlinking and control access per tenant.

---

## 📊 Custom Reporting

- 🔴 **PDF export** — add an export button on each analytics tab that generates a PDF report (using a library such as QuestPDF or PuppeteerSharp). Priority tabs: Overview, Threshold Alerts, Top Pests.
- 🔴 **CSV / Excel export** — expose a download endpoint for the main grids (sessions, observations, top pests, trap performance) so users can open the data in Excel.
- 🟡 **Date-range comparison mode** — allow users to compare two periods side by side (e.g. "this month vs last month") on the Overview and Seasonal Trends tabs.
- 🟡 **Saved filter presets** — let users save a named combination of date range + farm + field + scout so they can recall their most common views with one click.
- 🟢 **Scheduled report delivery** — let admins configure a weekly or monthly PDF report to be emailed automatically to a list of recipients.
- 🟢 **Custom KPI thresholds** — allow per-farm or per-field override of the Field Coverage target (currently hardcoded to 4 sessions/month).

---

## 🔔 Push Notifications

- 🔴 **Mobile push notifications** — the Settings page has a notification preference toggle but there is no FCM/APNs integration in the .NET MAUI app. Implement `INotificationService` backed by Firebase Cloud Messaging.
- 🔴 **Threshold breach push** — send a push notification to the assigned scout and farm admin immediately when a breach observation is saved.
- 🟡 **Session assigned push** — notify the scout when a new planned session is assigned to them via the web app.
- 🟡 **Overdue session push** — daily reminder push to scouts with overdue planned sessions.

---

## 👤 Auth & User Management

- 🔴 **Forgot password / reset password flow** (see Email section — same ticket)
- 🔴 **Email confirmation on signup** (see Email section — same ticket)
- 🟡 **Change password on web** — the Settings page has no "Change Password" form for the currently logged-in user. The mobile app has this flow but the web does not.
- 🟡 **Session / token revocation on password change** — when a user changes their password, all existing refresh tokens should be invalidated.
- 🟡 **Admin: force password reset** — admins should be able to trigger a password reset email for any team member.
- 🟢 **Audit log** — record who created, updated, or deleted entities for compliance. The `CreatedBy` / `UpdatedBy` fields exist on sessions and observations but there is no dedicated audit trail viewer.

---

## 🗺 Maps & Location

- 🟡 **Observation map pins on web** — the dashboard map shows trap locations, but individual pest observations with GPS coordinates are not plotted. Add a toggleable observations layer.
- 🟡 **Field boundary drawing** — `Farm.BoundaryGeoJson` and `Field.BoundaryGeoJson` fields exist in the schema but there is no UI to draw or upload field boundaries.
- 🟢 **Heat map layer** — overlay a pest density heat map on the field/farm map using observation coordinates.
- 🟢 **Offline maps on mobile** — cache map tiles for the farm area so scouts can see the map without a data signal.

---

## 🧪 Testing

- 🟡 **Integration tests for AnalyticsController** — all R0–R10 endpoints currently have no test coverage.
- 🟡 **Test coverage for AuthService edge cases** — password reset, email confirmation, invite flows (once implemented).
- 🟢 **Mobile UI tests** — no automated tests exist for the .NET MAUI app.

---

## ⚙️ Infrastructure & DevOps

- 🟡 **Production deployment pipeline** — no CI/CD workflow exists (no `.github/workflows` files). Add GitHub Actions for build, test, and deploy to Azure App Service / Container Apps.
- 🟡 **Secrets management** — JWT secret, DB connection string, and future Stripe/SendGrid keys are in `appsettings.json`. Move to Azure Key Vault or GitHub Actions secrets before any production deployment.
- 🟡 **Database backups** — no automated backup policy is documented. Configure point-in-time restore on the production database.
- 🟢 **Rate limiting** — the API has no rate limiting on auth endpoints. Add `AspNetCoreRateLimit` or the built-in .NET 7+ `RateLimiter` middleware, especially on `/auth/login` and `/auth/register`.
- 🟢 **Health check endpoint** — add `/health` for uptime monitoring and load balancer probes.

---

## 🌐 Web App — Minor UX / Polish

- 🟡 **Barcode scanning on mobile web** — the trap form has a `barcode` field and an input placeholder ("Scan or type barcode") but no camera scanning integration.
- 🟡 **Real-time dashboard** — the Active Sessions and Recent Activity panels currently require a manual page refresh. Add polling or SignalR to update them live.
- 🟢 **Dark mode toggle** — CSS variables are set up for theming but there is no user-facing toggle; it only follows the OS preference.
- 🟢 **Internationalisation (i18n)** — all strings are hard-coded in English. No i18n framework is in place.

---

*Last updated: May 2026*
