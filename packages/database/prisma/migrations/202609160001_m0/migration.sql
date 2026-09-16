CREATE EXTENSION IF NOT EXISTS citext;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('restaurant', 'bar', 'hotel', 'beach_club');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('it', 'en');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('trial', 'base', 'pro', 'full');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended', 'cancelled');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('owner', 'staff');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('direct', 'staff', 'phone');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('customer', 'staff');

-- CreateEnum
CREATE TYPE "ReviewChannel" AS ENUM ('google_redirect', 'private');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('confirmation', 'reminder', 'cancellation', 'low_review_alert');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms', 'push');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('queued', 'sent', 'failed');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "TenantType" NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "locale_default" "Locale" NOT NULL DEFAULT 'it',
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#0E2B2F',
    "address" TEXT,
    "phone" TEXT,
    "google_place_id" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'trial',
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "last_login_at" TIMESTAMPTZ(6),
    "status" "StaffStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSettings" (
    "tenant_id" UUID NOT NULL,
    "slot_granularity_min" INTEGER NOT NULL DEFAULT 15,
    "turn_duration_min" INTEGER NOT NULL DEFAULT 90,
    "max_covers_per_slot" INTEGER NOT NULL DEFAULT 12,
    "total_capacity" INTEGER NOT NULL DEFAULT 40,
    "min_lead_time_min" INTEGER NOT NULL DEFAULT 60,
    "max_advance_days" INTEGER NOT NULL DEFAULT 60,
    "auto_confirm" BOOLEAN NOT NULL DEFAULT true,
    "cancellation_deadline_hours" INTEGER NOT NULL DEFAULT 2,
    "auto_assign_tables" BOOLEAN NOT NULL DEFAULT false,
    "reminder_hours_before" INTEGER NOT NULL DEFAULT 4,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sms_monthly_cap" INTEGER NOT NULL DEFAULT 300,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "OpeningHours" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "capacity_override" INTEGER,
    "label" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "OpeningHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlackoutDate" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(0),
    "end_time" TIME(0),
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BlackoutDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "min_capacity" INTEGER NOT NULL DEFAULT 1,
    "max_capacity" INTEGER NOT NULL,
    "zone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_e164" TEXT,
    "email" CITEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "allergies" TEXT,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "marketing_consent_at" TIMESTAMPTZ(6),
    "total_visits" INTEGER NOT NULL DEFAULT 0,
    "no_show_count" INTEGER NOT NULL DEFAULT 0,
    "last_visit_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "table_id" UUID,
    "reserved_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "party_size" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL,
    "source" "ReservationSource" NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "internal_notes" TEXT NOT NULL DEFAULT '',
    "cancel_token" TEXT NOT NULL,
    "cancelled_by" "CancelledBy",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name_it" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name_it" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_it" TEXT,
    "description_en" TEXT,
    "price_cents" INTEGER NOT NULL,
    "image_url" TEXT,
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "nfc_card_id" UUID,
    "rating" INTEGER,
    "comment" TEXT,
    "channel" "ReviewChannel" NOT NULL,
    "staff_seen_at" TIMESTAMPTZ(6),
    "staff_response" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFCCard" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "card_uid" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_tapped_at" TIMESTAMPTZ(6),
    "tap_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NFCCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reservation_id" UUID,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'queued',
    "provider_id" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "staff_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "staff_user_id" UUID NOT NULL,
    "refresh_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_tenant_id_email_key" ON "StaffUser"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_tenant_id_id_key" ON "StaffUser"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "OpeningHours_tenant_id_weekday_idx" ON "OpeningHours"("tenant_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHours_tenant_id_id_key" ON "OpeningHours"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "BlackoutDate_tenant_id_date_idx" ON "BlackoutDate"("tenant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BlackoutDate_tenant_id_id_key" ON "BlackoutDate"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_tenant_id_id_key" ON "RestaurantTable"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenant_id_phone_e164_key" ON "Customer"("tenant_id", "phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenant_id_id_key" ON "Customer"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_cancel_token_key" ON "Reservation"("cancel_token");

-- CreateIndex
CREATE INDEX "Reservation_tenant_id_reserved_at_idx" ON "Reservation"("tenant_id", "reserved_at");

-- CreateIndex
CREATE INDEX "Reservation_tenant_id_status_idx" ON "Reservation"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_tenant_id_id_key" ON "Reservation"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_tenant_id_id_key" ON "MenuCategory"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "MenuItem_tenant_id_category_id_idx" ON "MenuItem"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_tenant_id_id_key" ON "MenuItem"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Review_tenant_id_id_key" ON "Review"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "NFCCard_card_uid_key" ON "NFCCard"("card_uid");

-- CreateIndex
CREATE UNIQUE INDEX "NFCCard_tenant_id_id_key" ON "NFCCard"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_tenant_id_id_key" ON "NotificationLog"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_tenant_id_id_key" ON "AuditLog"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_refresh_hash_key" ON "StaffSession"("refresh_hash");

-- CreateIndex
CREATE INDEX "StaffSession_tenant_id_staff_user_id_idx" ON "StaffSession"("tenant_id", "staff_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_tenant_id_id_key" ON "StaffSession"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningHours" ADD CONSTRAINT "OpeningHours_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlackoutDate" ADD CONSTRAINT "BlackoutDate_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tenant_id_customer_id_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "Customer"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tenant_id_table_id_fkey" FOREIGN KEY ("tenant_id", "table_id") REFERENCES "RestaurantTable"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_tenant_id_category_id_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "MenuCategory"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenant_id_customer_id_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "Customer"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenant_id_nfc_card_id_fkey" FOREIGN KEY ("tenant_id", "nfc_card_id") REFERENCES "NFCCard"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NFCCard" ADD CONSTRAINT "NFCCard_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenant_id_reservation_id_fkey" FOREIGN KEY ("tenant_id", "reservation_id") REFERENCES "Reservation"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenant_id_staff_user_id_fkey" FOREIGN KEY ("tenant_id", "staff_user_id") REFERENCES "StaffUser"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_tenant_id_staff_user_id_fkey" FOREIGN KEY ("tenant_id", "staff_user_id") REFERENCES "StaffUser"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- Vincoli non esprimibili nello schema Prisma.
CREATE UNIQUE INDEX "NotificationLog_active_reservation_type_key"
ON "NotificationLog" ("reservation_id", "type") WHERE "status" <> 'failed';
ALTER TABLE "Tenant" ADD CONSTRAINT "tenant_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "Tenant" ADD CONSTRAINT "tenant_color_format" CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$');
CREATE FUNCTION prevent_tenant_identity_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id <> OLD.id OR NEW.slug <> OLD.slug THEN RAISE EXCEPTION 'Tenant identity is immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER tenant_identity_immutable BEFORE UPDATE ON "Tenant" FOR EACH ROW EXECUTE FUNCTION prevent_tenant_identity_change();
ALTER TABLE "TenantSettings" ADD CONSTRAINT "positive_settings" CHECK (
 slot_granularity_min > 0 AND turn_duration_min > 0 AND max_covers_per_slot > 0 AND total_capacity > 0 AND min_lead_time_min >= 0 AND max_advance_days > 0 AND cancellation_deadline_hours >= 0 AND reminder_hours_before >= 0 AND sms_monthly_cap >= 0
);
ALTER TABLE "OpeningHours" ADD CONSTRAINT "valid_opening" CHECK (weekday BETWEEN 0 AND 6 AND start_time <> end_time AND (capacity_override IS NULL OR capacity_override > 0));
ALTER TABLE "BlackoutDate" ADD CONSTRAINT "valid_blackout" CHECK ((start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time <> end_time));
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "table_capacity" CHECK (min_capacity > 0 AND max_capacity >= min_capacity);
ALTER TABLE "Customer" ADD CONSTRAINT "customer_counts" CHECK (total_visits >= 0 AND no_show_count >= 0);
ALTER TABLE "Customer" ADD CONSTRAINT "customer_phone" CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{1,14}$');
ALTER TABLE "Customer" ADD CONSTRAINT "marketing_consent_timestamp" CHECK (NOT marketing_consent OR marketing_consent_at IS NOT NULL);
ALTER TABLE "Reservation" ADD CONSTRAINT "reservation_size" CHECK (party_size >= 1 AND duration_min > 0);
ALTER TABLE "Reservation" ADD CONSTRAINT "cancel_token_entropy" CHECK (cancel_token ~ '^[0-9a-f]{64}$');
ALTER TABLE "MenuItem" ADD CONSTRAINT "integer_price_nonnegative" CHECK (price_cents >= 0);
ALTER TABLE "MenuItem" ADD CONSTRAINT "valid_dietary" CHECK (dietary <@ ARRAY['vegetarian','vegan','gluten_free','spicy']::text[]);
ALTER TABLE "MenuItem" ADD CONSTRAINT "valid_allergens" CHECK (allergens <@ ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14']::text[]);
ALTER TABLE "Review" ADD CONSTRAINT "review_channel_rating" CHECK ((channel = 'google_redirect' AND rating IS NULL) OR (channel = 'private' AND rating IS NOT NULL AND rating BETWEEN 1 AND 5));
ALTER TABLE "NFCCard" ADD CONSTRAINT "tap_count_nonnegative" CHECK (tap_count >= 0);
