-- FASE 7 - Timeline imutavel de pedidos

CREATE TABLE "pedido_timeline" (
  "id" TEXT NOT NULL,
  "pedido_id" TEXT NOT NULL,
  "ator" VARCHAR(40) NOT NULL,
  "acao" TEXT NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pedido_timeline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pedido_timeline_pedido_id_idx" ON "pedido_timeline"("pedido_id");
CREATE INDEX "pedido_timeline_criado_em_idx" ON "pedido_timeline"("criado_em");

ALTER TABLE "pedido_timeline"
  ADD CONSTRAINT "pedido_timeline_pedido_id_fkey"
  FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "pedido_timeline" ("id", "pedido_id", "ator", "acao", "criado_em")
SELECT
  'tl_' || "id" || '_criado',
  "id",
  'SISTEMA',
  'Pedido criado',
  "criado_em"
FROM "pedidos"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "pedido_timeline" ("id", "pedido_id", "ator", "acao", "criado_em")
SELECT
  'tl_' || "id" || '_status_atual',
  "id",
  'SISTEMA',
  'Status atual: ' || "status"::text,
  "atualizado_em"
FROM "pedidos"
WHERE "atualizado_em" <> "criado_em"
ON CONFLICT ("id") DO NOTHING;
