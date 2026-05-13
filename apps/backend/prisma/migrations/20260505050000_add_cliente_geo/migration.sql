-- AlterTable
ALTER TABLE "clientes"
  ADD COLUMN "cep"         VARCHAR(8),
  ADD COLUMN "numero"      VARCHAR(20),
  ADD COLUMN "quadra"      VARCHAR(20),
  ADD COLUMN "lote"        VARCHAR(20),
  ADD COLUMN "complemento" VARCHAR(100),
  ADD COLUMN "lat"         DOUBLE PRECISION,
  ADD COLUMN "lng"         DOUBLE PRECISION,
  ADD COLUMN "nrinscr"     VARCHAR(14);

CREATE INDEX "clientes_nrinscr_idx" ON "clientes"("nrinscr");
CREATE INDEX "clientes_cep_idx" ON "clientes"("cep");
