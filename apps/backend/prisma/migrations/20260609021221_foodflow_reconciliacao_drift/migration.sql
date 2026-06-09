-- AlterEnum
ALTER TYPE "CampanhaStatus" ADD VALUE IF NOT EXISTS 'AGENDADA';

-- DropIndex
DROP INDEX IF EXISTS "clientes_ativo_idx";

-- DropIndex
DROP INDEX IF EXISTS "clientes_cep_idx";

-- DropIndex
DROP INDEX IF EXISTS "clientes_nrinscr_idx";

-- DropIndex
DROP INDEX IF EXISTS "pedidos_bairro_entrega_idx";

-- DropIndex
DROP INDEX IF EXISTS "pedidos_nps_enviado_em_idx";

-- DropIndex
DROP INDEX IF EXISTS "pedidos_status_mudou_em_idx";

-- AlterTable
ALTER TABLE "campanhas_destinatarios" ADD COLUMN IF NOT EXISTS "tentativas" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "campanhas_marketing" ADD COLUMN IF NOT EXISTS "agendada_para" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leads_marketing" ADD COLUMN IF NOT EXISTS "human_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "ultima_interacao_em" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lista_negra_clientes" ALTER COLUMN "atualizado_em" DROP DEFAULT;

-- AlterTable
ALTER TABLE "loja_configuracao" ADD COLUMN IF NOT EXISTS "faixas_entrega" JSONB;

-- AlterTable
ALTER TABLE "motoboys" ADD COLUMN IF NOT EXISTS "percentual_entregas" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "tipo_remuneracao" TEXT NOT NULL DEFAULT 'FIXO_POR_ENTREGA',
ADD COLUMN IF NOT EXISTS "valor_fixo_por_entrega" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE IF NOT EXISTS "blacklist_whatsapp" (
    "telefone" VARCHAR(20) NOT NULL,
    "motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklist_whatsapp_pkey" PRIMARY KEY ("telefone")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mensagens_lead" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "origem" "OrigemMensagem" NOT NULL,
    "texto" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sessao_pedido_whatsapp" (
    "id" TEXT NOT NULL,
    "clienteTelefone" VARCHAR(20) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "itens" JSONB NOT NULL DEFAULT '[]',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxaEntrega" DECIMAL(10,2),
    "endereco" TEXT,
    "bairro" VARCHAR(100),
    "cep" VARCHAR(8),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_interacao_em" TIMESTAMP(3) NOT NULL,
    "expirada_em" TIMESTAMP(3),
    "pedido_id" TEXT,

    CONSTRAINT "sessao_pedido_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mensagens_lead_lead_id_criado_em_idx" ON "mensagens_lead"("lead_id" ASC, "criado_em" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sessao_pedido_whatsapp_clienteTelefone_status_idx" ON "sessao_pedido_whatsapp"("clienteTelefone" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sessao_pedido_whatsapp_pedido_id_key" ON "sessao_pedido_whatsapp"("pedido_id" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sessao_pedido_whatsapp_ultima_interacao_em_idx" ON "sessao_pedido_whatsapp"("ultima_interacao_em" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "campanhas_marketing_agendada_para_idx" ON "campanhas_marketing"("agendada_para" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_marketing_ultima_interacao_em_idx" ON "leads_marketing"("ultima_interacao_em" ASC);

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mensagens_lead_lead_id_fkey') THEN
    ALTER TABLE "mensagens_lead" ADD CONSTRAINT "mensagens_lead_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads_marketing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- FoodFlow: tenant_id nas 3 tabelas reconciliadas (completa a F0a)
ALTER TABLE "mensagens_lead" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "blacklist_whatsapp" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "sessao_pedido_whatsapp" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
CREATE INDEX IF NOT EXISTS "mensagens_lead_tenant_id_idx" ON "mensagens_lead"("tenant_id");
CREATE INDEX IF NOT EXISTS "blacklist_whatsapp_tenant_id_idx" ON "blacklist_whatsapp"("tenant_id");
CREATE INDEX IF NOT EXISTS "sessao_pedido_whatsapp_tenant_id_idx" ON "sessao_pedido_whatsapp"("tenant_id");
UPDATE "mensagens_lead" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "blacklist_whatsapp" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "sessao_pedido_whatsapp" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
