ALTER TABLE "clientes"
ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "clientes_ativo_idx" ON "clientes"("ativo");
