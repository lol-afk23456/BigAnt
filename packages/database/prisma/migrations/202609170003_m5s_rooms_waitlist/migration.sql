-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('waiting', 'seated', 'left');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "table_group_id" UUID,
ADD COLUMN     "table_group_name" TEXT;

-- CreateTable
CREATE TABLE "TableGroup" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "min_capacity" INTEGER NOT NULL,
    "max_capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TableGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableGroupMember" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,

    CONSTRAINT "TableGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationTable" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "table_name" TEXT NOT NULL,

    CONSTRAINT "ReservationTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "surname" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "service_date" DATE NOT NULL,
    "service_key" TEXT NOT NULL,
    "service_label" TEXT,
    "service_start" TIMESTAMPTZ(6) NOT NULL,
    "service_end" TIMESTAMPTZ(6) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'waiting',
    "reservation_id" UUID,
    "anonymized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TableGroup_tenant_id_id_key" ON "TableGroup"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TableGroupMember_tenant_id_id_key" ON "TableGroupMember"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TableGroupMember_tenant_id_group_id_table_id_key" ON "TableGroupMember"("tenant_id", "group_id", "table_id");

-- CreateIndex
CREATE INDEX "ReservationTable_tenant_id_table_id_idx" ON "ReservationTable"("tenant_id", "table_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationTable_tenant_id_id_key" ON "ReservationTable"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationTable_tenant_id_reservation_id_table_id_key" ON "ReservationTable"("tenant_id", "reservation_id", "table_id");

-- CreateIndex
CREATE INDEX "WaitlistEntry_tenant_id_service_date_status_created_at_idx" ON "WaitlistEntry"("tenant_id", "service_date", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_tenant_id_id_key" ON "WaitlistEntry"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_tenant_id_reservation_id_key" ON "WaitlistEntry"("tenant_id", "reservation_id");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tenant_id_table_group_id_fkey" FOREIGN KEY ("tenant_id", "table_group_id") REFERENCES "TableGroup"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TableGroup" ADD CONSTRAINT "TableGroup_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableGroupMember" ADD CONSTRAINT "TableGroupMember_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableGroupMember" ADD CONSTRAINT "TableGroupMember_tenant_id_group_id_fkey" FOREIGN KEY ("tenant_id", "group_id") REFERENCES "TableGroup"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TableGroupMember" ADD CONSTRAINT "TableGroupMember_tenant_id_table_id_fkey" FOREIGN KEY ("tenant_id", "table_id") REFERENCES "RestaurantTable"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReservationTable" ADD CONSTRAINT "ReservationTable_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationTable" ADD CONSTRAINT "ReservationTable_tenant_id_reservation_id_fkey" FOREIGN KEY ("tenant_id", "reservation_id") REFERENCES "Reservation"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReservationTable" ADD CONSTRAINT "ReservationTable_tenant_id_table_id_fkey" FOREIGN KEY ("tenant_id", "table_id") REFERENCES "RestaurantTable"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_tenant_id_reservation_id_fkey" FOREIGN KEY ("tenant_id", "reservation_id") REFERENCES "Reservation"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- Vincoli locali aggiuntivi; nessuna prenotazione esistente modificata.
ALTER TABLE "TableGroup" ADD CONSTRAINT "group_capacity" CHECK (min_capacity > 0 AND max_capacity >= min_capacity AND max_capacity <= 500);
ALTER TABLE "Reservation" ADD CONSTRAINT "reservation_single_or_group" CHECK (table_id IS NULL OR table_group_id IS NULL);
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "waitlist_service" CHECK (party_size BETWEEN 1 AND 500 AND service_end > service_start AND ((status = 'seated') = (reservation_id IS NOT NULL)));
CREATE FUNCTION prevent_group_capacity_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.min_capacity <> OLD.min_capacity OR NEW.max_capacity <> OLD.max_capacity THEN RAISE EXCEPTION 'Group capacity is immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER group_capacity_immutable BEFORE UPDATE ON "TableGroup" FOR EACH ROW EXECUTE FUNCTION prevent_group_capacity_change();
CREATE FUNCTION prevent_group_member_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Group members are immutable';
END;
$$;
CREATE TRIGGER group_member_immutable BEFORE UPDATE ON "TableGroupMember" FOR EACH ROW EXECUTE FUNCTION prevent_group_member_change();
