-- FASE 6 - Operações (motoboy, cancelamento/estorno, status da loja)

CREATE TYPE "StatusMotoboy" AS ENUM ('DISPONIVEL', 'EM_ENTREGA', 'INATIVO');
CREATE TYPE "StatusLoja" AS ENUM ('ABERTO', 'FECHADO', 'PAUSADO');

CREATE TABLE "motoboys" (
  "id" TEXT NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "telefone" VARCHAR(20) NOT NULL,
  "status" "StatusMotoboy" NOT NULL DEFAULT 'DISPONIVEL',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "motoboys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "motoboys_telefone_key" ON "motoboys"("telefone");
CREATE INDEX "motoboys_status_idx" ON "motoboys"("status");

CREATE TABLE "loja_configuracao" (
  "id" TEXT NOT NULL DEFAULT 'loja_principal',
  "status" "StatusLoja" NOT NULL DEFAULT 'ABERTO',
  "mensagem_pausado" TEXT,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "loja_configuracao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pedidos"
  ADD COLUMN "motoboy_id" TEXT,
  ADD COLUMN "observacao_entrega" TEXT,
  ADD COLUMN "cancelado_motivo" TEXT,
  ADD COLUMN "estorno_necessario" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "estorno_realizado_em" TIMESTAMP(3);

CREATE INDEX "pedidos_motoboy_id_idx" ON "pedidos"("motoboy_id");

ALTER TABLE "pedidos"
  ADD CONSTRAINT "pedidos_motoboy_id_fkey" FOREIGN KEY ("motoboy_id") REFERENCES "motoboys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "loja_configuracao" ("id", "status", "atualizado_em")
VALUES ('loja_principal', 'ABERTO', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
