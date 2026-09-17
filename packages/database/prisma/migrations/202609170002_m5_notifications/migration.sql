ALTER TYPE "NotificationStatus" ADD VALUE 'processing';
ALTER TYPE "NotificationStatus" ADD VALUE 'uncertain';
ALTER TYPE "NotificationStatus" ADD VALUE 'simulated';
ALTER TYPE "NotificationStatus" ADD VALUE 'skipped';
ALTER TABLE "TenantSettings" ADD COLUMN "retention_months" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "privacy_contact_email" CITEXT,
  ADD CONSTRAINT "TenantSettings_retention_check" CHECK (retention_months BETWEEN 1 AND 120);
ALTER TABLE "Customer" ADD COLUMN "anonymized_at" TIMESTAMPTZ(6);
ALTER TABLE "AuditLog" ALTER COLUMN "staff_user_id" DROP NOT NULL;
ALTER TABLE "Reservation" ADD COLUMN "locale" "Locale" NOT NULL DEFAULT 'it',
  ADD COLUMN "privacy_accepted_at" TIMESTAMPTZ(6);
DROP INDEX "NotificationLog_active_reservation_type_key";
ALTER TABLE "NotificationLog" ADD COLUMN "event_key" TEXT,
  ADD COLUMN "event_name" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "recipient_hash" TEXT,
  ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "due_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "attempted_at" TIMESTAMPTZ(6),
  ADD COLUMN "error_code" TEXT,
  ADD COLUMN "fallback" BOOLEAN NOT NULL DEFAULT false;
UPDATE "NotificationLog" SET event_key = 'legacy:' || id, recipient_hash = id::text;
ALTER TABLE "NotificationLog" ALTER COLUMN event_key SET NOT NULL, ALTER COLUMN recipient_hash SET NOT NULL;
CREATE UNIQUE INDEX "NotificationLog_tenant_id_event_key_channel_recipient_hash_key"
  ON "NotificationLog" (tenant_id, event_key, channel, recipient_hash);
CREATE INDEX "NotificationLog_tenant_id_status_due_at_idx" ON "NotificationLog" (tenant_id, status, due_at);
CREATE TABLE "PushSubscription" (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL,
  endpoint_hash TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "PushSubscription_staff_fkey" FOREIGN KEY (tenant_id, staff_user_id)
    REFERENCES "StaffUser"(tenant_id, id) ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "PushSubscription_tenant_id_id_key" ON "PushSubscription"(tenant_id, id);
CREATE UNIQUE INDEX "PushSubscription_tenant_id_staff_user_id_endpoint_hash_key"
  ON "PushSubscription"(tenant_id, staff_user_id, endpoint_hash);
