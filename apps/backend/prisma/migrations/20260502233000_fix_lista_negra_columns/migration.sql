-- Corrige divergencia entre schema Prisma e banco em lista_negra_clientes
-- Idempotente para rodar com seguranca em ambientes ja alinhados

ALTER TABLE "lista_negra_clientes"
  ADD COLUMN IF NOT EXISTS "nivel" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "total_ocorrencias" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "registrado_por" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "lista_negra_clientes_nivel_idx" ON "lista_negra_clientes"("nivel");

CREATE TABLE IF NOT EXISTS "ocorrencias_lista_negra" (
  "id" TEXT NOT NULL,
  "cliente_telefone" VARCHAR(20) NOT NULL,
  "motivo" TEXT NOT NULL,
  "registrado_por" VARCHAR(100),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ocorrencias_lista_negra_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ocorrencias_lista_negra_cliente_telefone_idx" ON "ocorrencias_lista_negra"("cliente_telefone");
CREATE INDEX IF NOT EXISTS "ocorrencias_lista_negra_criado_em_idx" ON "ocorrencias_lista_negra"("criado_em");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ocorrencias_lista_negra_cliente_telefone_fkey'
  ) THEN
    ALTER TABLE "ocorrencias_lista_negra"
      ADD CONSTRAINT "ocorrencias_lista_negra_cliente_telefone_fkey"
      FOREIGN KEY ("cliente_telefone")
      REFERENCES "lista_negra_clientes"("cliente_telefone")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
