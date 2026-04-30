-- AlterEnum
ALTER TYPE "StatusPedido" ADD VALUE 'AGUARDANDO_PAGAMENTO';
ALTER TYPE "StatusPedido" ADD VALUE 'EXPIRADO';
ALTER TYPE "StatusPedido" ADD VALUE 'ABANDONADO';

-- AlterTable
ALTER TABLE "pedidos"
ADD COLUMN "pagamento_expira_em" TIMESTAMP(3),
ADD COLUMN "abandonado_em" TIMESTAMP(3),
ADD COLUMN "recuperado_em" TIMESTAMP(3),
ADD COLUMN "tentativas_recuperacao" INTEGER NOT NULL DEFAULT 0;
