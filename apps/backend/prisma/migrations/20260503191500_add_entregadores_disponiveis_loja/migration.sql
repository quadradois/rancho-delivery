ALTER TABLE "loja_configuracao"
  ADD COLUMN IF NOT EXISTS "entregadores_disponiveis_dia" INTEGER NOT NULL DEFAULT 0;
