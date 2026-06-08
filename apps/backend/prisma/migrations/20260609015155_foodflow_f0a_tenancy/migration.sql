-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "bairros" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "pedido_timeline" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "itens_pedido" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "fichas_tecnicas" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "ingredientes_ficha" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "indicacoes" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "roleta_giros" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "contatos_minerados" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "mensagens_cliente" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "lista_negra_clientes" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "ocorrencias_lista_negra" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "motoboys" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "loja_configuracao" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "configuracoes_alerta" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "relatorios_dia" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "leads_marketing" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "conexoes_whatsapp" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "campanhas_marketing" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "campanhas_destinatarios" ADD COLUMN     "tenant_id" TEXT;

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "dominio" VARCHAR(255),
    "tema" JSONB,
    "logo_url" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_dominio_key" ON "tenants"("dominio");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_dominio_idx" ON "tenants"("dominio");

-- CreateIndex
CREATE INDEX "clientes_tenant_id_idx" ON "clientes"("tenant_id");

-- CreateIndex
CREATE INDEX "produtos_tenant_id_idx" ON "produtos"("tenant_id");

-- CreateIndex
CREATE INDEX "bairros_tenant_id_idx" ON "bairros"("tenant_id");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_idx" ON "pedidos"("tenant_id");

-- CreateIndex
CREATE INDEX "pedido_timeline_tenant_id_idx" ON "pedido_timeline"("tenant_id");

-- CreateIndex
CREATE INDEX "itens_pedido_tenant_id_idx" ON "itens_pedido"("tenant_id");

-- CreateIndex
CREATE INDEX "fichas_tecnicas_tenant_id_idx" ON "fichas_tecnicas"("tenant_id");

-- CreateIndex
CREATE INDEX "ingredientes_ficha_tenant_id_idx" ON "ingredientes_ficha"("tenant_id");

-- CreateIndex
CREATE INDEX "indicacoes_tenant_id_idx" ON "indicacoes"("tenant_id");

-- CreateIndex
CREATE INDEX "roleta_giros_tenant_id_idx" ON "roleta_giros"("tenant_id");

-- CreateIndex
CREATE INDEX "contatos_minerados_tenant_id_idx" ON "contatos_minerados"("tenant_id");

-- CreateIndex
CREATE INDEX "mensagens_cliente_tenant_id_idx" ON "mensagens_cliente"("tenant_id");

-- CreateIndex
CREATE INDEX "lista_negra_clientes_tenant_id_idx" ON "lista_negra_clientes"("tenant_id");

-- CreateIndex
CREATE INDEX "ocorrencias_lista_negra_tenant_id_idx" ON "ocorrencias_lista_negra"("tenant_id");

-- CreateIndex
CREATE INDEX "motoboys_tenant_id_idx" ON "motoboys"("tenant_id");

-- CreateIndex
CREATE INDEX "loja_configuracao_tenant_id_idx" ON "loja_configuracao"("tenant_id");

-- CreateIndex
CREATE INDEX "configuracoes_alerta_tenant_id_idx" ON "configuracoes_alerta"("tenant_id");

-- CreateIndex
CREATE INDEX "relatorios_dia_tenant_id_idx" ON "relatorios_dia"("tenant_id");

-- CreateIndex
CREATE INDEX "leads_marketing_tenant_id_idx" ON "leads_marketing"("tenant_id");

-- CreateIndex
CREATE INDEX "conexoes_whatsapp_tenant_id_idx" ON "conexoes_whatsapp"("tenant_id");

-- CreateIndex
CREATE INDEX "campanhas_marketing_tenant_id_idx" ON "campanhas_marketing"("tenant_id");

-- CreateIndex
CREATE INDEX "campanhas_destinatarios_tenant_id_idx" ON "campanhas_destinatarios"("tenant_id");


-- FoodFlow F0a: seed do tenant Rancho + backfill (idempotente)
INSERT INTO "tenants" ("id","slug","nome","ativo","criado_em","atualizado_em")
VALUES ('rancho','rancho','Rancho Comida Caseira',true,NOW(),NOW()) ON CONFLICT ("slug") DO NOTHING;
UPDATE "clientes" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "produtos" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "bairros" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "pedidos" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "pedido_timeline" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "itens_pedido" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "fichas_tecnicas" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "ingredientes_ficha" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "indicacoes" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "roleta_giros" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "contatos_minerados" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "mensagens_cliente" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "lista_negra_clientes" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "ocorrencias_lista_negra" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "motoboys" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "loja_configuracao" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "configuracoes_alerta" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "relatorios_dia" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "leads_marketing" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "campanhas_marketing" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "campanhas_destinatarios" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
UPDATE "conexoes_whatsapp" SET "tenant_id"='rancho' WHERE "tenant_id" IS NULL;
