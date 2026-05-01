-- Snapshot de endereco por pedido para evitar sobrescrever cadastro global do cliente
ALTER TABLE "pedidos"
  ADD COLUMN "endereco_entrega" TEXT,
  ADD COLUMN "bairro_entrega" VARCHAR(100);

-- Backfill inicial com dados do cliente atual para pedidos legados
UPDATE "pedidos" p
SET
  "endereco_entrega" = c."endereco",
  "bairro_entrega" = c."bairro"
FROM "clientes" c
WHERE c."telefone" = p."cliente_telefone"
  AND (p."endereco_entrega" IS NULL OR p."bairro_entrega" IS NULL);

CREATE INDEX "pedidos_bairro_entrega_idx" ON "pedidos"("bairro_entrega");
