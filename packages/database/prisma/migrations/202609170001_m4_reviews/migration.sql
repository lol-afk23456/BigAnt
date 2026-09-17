-- Indici additivi per cooldown card e segnalazioni private non viste.
CREATE INDEX "Review_tenant_id_nfc_card_id_created_at_idx" ON "Review"("tenant_id", "nfc_card_id", "created_at");
CREATE INDEX "Review_tenant_id_channel_staff_seen_at_created_at_idx" ON "Review"("tenant_id", "channel", "staff_seen_at", "created_at");
CREATE INDEX "NFCCard_tenant_id_active_idx" ON "NFCCard"("tenant_id", "active");
