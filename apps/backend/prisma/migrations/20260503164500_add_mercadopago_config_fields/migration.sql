ALTER TABLE "loja_configuracao"
  ADD COLUMN "mercadopago_ativo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mercadopago_public_key" VARCHAR(255),
  ADD COLUMN "mercadopago_access_token" TEXT,
  ADD COLUMN "mercadopago_webhook_secret" VARCHAR(255),
  ADD COLUMN "mercadopago_webhook_url" VARCHAR(500);
