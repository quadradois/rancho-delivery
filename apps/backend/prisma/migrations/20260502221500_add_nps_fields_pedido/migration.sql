ALTER TABLE "pedidos"
  ADD COLUMN "nps_enviado_em" TIMESTAMP(3),
  ADD COLUMN "nps_nota" INTEGER,
  ADD COLUMN "nps_feedback" TEXT;

CREATE INDEX "pedidos_nps_enviado_em_idx" ON "pedidos"("nps_enviado_em");
