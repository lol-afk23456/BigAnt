-- Personalizzazione menu e visibilità indipendente dall’esaurimento.
ALTER TABLE "TenantSettings" ADD COLUMN "menu_template" TEXT NOT NULL DEFAULT 'essential', ADD COLUMN "menu_primary_color" TEXT NOT NULL DEFAULT '#ff914d', ADD COLUMN "menu_cover_url" TEXT;
ALTER TABLE "TenantSettings" ADD CONSTRAINT "menu_template_valid" CHECK ("menu_template" IN ('essential', 'pop', 'elegant', 'pub')), ADD CONSTRAINT "menu_color_valid" CHECK ("menu_primary_color" ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE "MenuItem" ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT true;
