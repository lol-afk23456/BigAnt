CREATE TABLE "PlatformAdmin" (
 "id" UUID PRIMARY KEY, "email" CITEXT NOT NULL UNIQUE, "full_name" TEXT NOT NULL,
 "password_hash" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL
);
CREATE TABLE "PlatformSession" (
 "id" UUID PRIMARY KEY, "admin_id" UUID NOT NULL REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE,
 "token_hash" TEXT NOT NULL UNIQUE, "expires_at" TIMESTAMPTZ(6) NOT NULL, "revoked_at" TIMESTAMPTZ(6),
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PlatformSession_admin_id_expires_at_idx" ON "PlatformSession"("admin_id", "expires_at");
CREATE TABLE "PlatformAccount" (
 "tenant_id" UUID PRIMARY KEY REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "contact_name" TEXT NOT NULL DEFAULT '', "contact_email" CITEXT,
 "monthly_fee_cents" INTEGER NOT NULL DEFAULT 0 CHECK ("monthly_fee_cents" >= 0),
 "trial_ends_at" DATE, "renewal_at" DATE, "notes" TEXT NOT NULL DEFAULT '', "updated_at" TIMESTAMPTZ(6) NOT NULL
);
CREATE TABLE "PlatformAudit" (
 "id" UUID PRIMARY KEY, "admin_id" UUID NOT NULL REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT,
 "tenant_id" UUID REFERENCES "Tenant"("id") ON DELETE SET NULL,
 "action" TEXT NOT NULL, "metadata" JSONB NOT NULL DEFAULT '{}',
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PlatformAudit_tenant_id_created_at_idx" ON "PlatformAudit"("tenant_id", "created_at");
CREATE INDEX "PlatformAudit_admin_id_created_at_idx" ON "PlatformAudit"("admin_id", "created_at");
CREATE TABLE "PlatformAccessLink" (
 "id" UUID PRIMARY KEY, "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
 "staff_user_id" UUID NOT NULL, "admin_id" UUID NOT NULL REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT,
 "token_hash" TEXT NOT NULL UNIQUE, "expires_at" TIMESTAMPTZ(6) NOT NULL, "used_at" TIMESTAMPTZ(6),
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("tenant_id", "staff_user_id") REFERENCES "StaffUser"("tenant_id", "id") ON DELETE CASCADE
);
CREATE INDEX "PlatformAccessLink_tenant_id_staff_user_id_idx" ON "PlatformAccessLink"("tenant_id", "staff_user_id");
