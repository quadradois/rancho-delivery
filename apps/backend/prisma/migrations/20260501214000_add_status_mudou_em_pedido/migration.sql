-- Campo dedicado para controlar quando o status do pedido realmente mudou
ALTER TABLE "pedidos"
  ADD COLUMN "status_mudou_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill inicial com atualizado_em para manter coerência com histórico existente
UPDATE "pedidos"
SET "status_mudou_em" = "atualizado_em"
WHERE "status_mudou_em" IS NULL;

CREATE INDEX "pedidos_status_mudou_em_idx" ON "pedidos"("status_mudou_em");
