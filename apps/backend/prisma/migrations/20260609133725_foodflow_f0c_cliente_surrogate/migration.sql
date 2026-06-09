-- FoodFlow F0c — Cliente: chave surrogate (id cuid) no lugar de telefone @id global.
-- telefone passa a ser unico por tenant (@@unique(tenant_id, telefone)).
-- Todas as FKs que apontavam para clientes.telefone passam a apontar para clientes.id
-- (clienteId nas filhas); cliente_telefone permanece como coluna denormalizada (leitura).
-- Tabelas de cliente/pedido estao vazias em producao; sem backfill necessario.
-- Reproduzivel do zero: no CI (banco zerado) as tabelas estao vazias, ADD COLUMN NOT NULL passa.

-- DropForeignKey
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_cliente_telefone_fkey";

-- DropForeignKey
ALTER TABLE "indicacoes" DROP CONSTRAINT "indicacoes_indicador_telefone_fkey";

-- DropForeignKey
ALTER TABLE "indicacoes" DROP CONSTRAINT "indicacoes_indicado_telefone_fkey";

-- DropForeignKey
ALTER TABLE "mensagens_cliente" DROP CONSTRAINT "mensagens_cliente_cliente_telefone_fkey";

-- DropForeignKey
ALTER TABLE "lista_negra_clientes" DROP CONSTRAINT "lista_negra_clientes_cliente_telefone_fkey";

-- DropForeignKey
ALTER TABLE "ocorrencias_lista_negra" DROP CONSTRAINT "ocorrencias_lista_negra_cliente_telefone_fkey";

-- DropForeignKey
ALTER TABLE "leads_marketing" DROP CONSTRAINT "leads_marketing_cliente_telefone_fkey";

-- DropIndex
DROP INDEX "indicacoes_indicado_telefone_key";

-- DropIndex
DROP INDEX "lista_negra_clientes_cliente_telefone_key";

-- AlterTable
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "cliente_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "indicacoes" ADD COLUMN     "indicado_id" TEXT NOT NULL,
ADD COLUMN     "indicador_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "mensagens_cliente" ADD COLUMN     "cliente_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "lista_negra_clientes" ADD COLUMN     "cliente_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ocorrencias_lista_negra" ADD COLUMN     "lista_negra_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "leads_marketing" ADD COLUMN     "cliente_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clientes_tenant_id_telefone_key" ON "clientes"("tenant_id", "telefone");

-- CreateIndex
CREATE INDEX "pedidos_cliente_id_idx" ON "pedidos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicacoes_indicado_id_key" ON "indicacoes"("indicado_id");

-- CreateIndex
CREATE INDEX "indicacoes_indicador_id_idx" ON "indicacoes"("indicador_id");

-- CreateIndex
CREATE INDEX "mensagens_cliente_cliente_id_idx" ON "mensagens_cliente"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "lista_negra_clientes_cliente_id_key" ON "lista_negra_clientes"("cliente_id");

-- CreateIndex
CREATE INDEX "lista_negra_clientes_cliente_telefone_idx" ON "lista_negra_clientes"("cliente_telefone");

-- CreateIndex
CREATE INDEX "ocorrencias_lista_negra_lista_negra_id_idx" ON "ocorrencias_lista_negra"("lista_negra_id");

-- CreateIndex
CREATE INDEX "leads_marketing_cliente_id_idx" ON "leads_marketing"("cliente_id");

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_indicador_id_fkey" FOREIGN KEY ("indicador_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_indicado_id_fkey" FOREIGN KEY ("indicado_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_cliente" ADD CONSTRAINT "mensagens_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_negra_clientes" ADD CONSTRAINT "lista_negra_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias_lista_negra" ADD CONSTRAINT "ocorrencias_lista_negra_lista_negra_id_fkey" FOREIGN KEY ("lista_negra_id") REFERENCES "lista_negra_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_marketing" ADD CONSTRAINT "leads_marketing_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

