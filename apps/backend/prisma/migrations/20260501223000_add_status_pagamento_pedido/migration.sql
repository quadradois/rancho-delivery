-- Add explicit payment status tracking for admin cockpit
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'EXPIRADO');

ALTER TABLE "pedidos"
ADD COLUMN "status_pagamento" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE';

-- Backfill from current order status to preserve existing behavior
UPDATE "pedidos"
SET "status_pagamento" = CASE
  WHEN "status" IN ('CONFIRMADO', 'PREPARANDO', 'SAIU_ENTREGA', 'ENTREGUE') THEN 'CONFIRMADO'::"StatusPagamento"
  WHEN "status" IN ('EXPIRADO', 'ABANDONADO', 'CANCELADO') THEN 'EXPIRADO'::"StatusPagamento"
  ELSE 'PENDENTE'::"StatusPagamento"
END;
