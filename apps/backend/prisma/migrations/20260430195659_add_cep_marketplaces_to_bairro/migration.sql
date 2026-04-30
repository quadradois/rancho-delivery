-- AlterTable
ALTER TABLE "bairros" ADD COLUMN     "cep" VARCHAR(9),
ADD COLUMN     "link_99food" TEXT,
ADD COLUMN     "link_ifood" TEXT,
ADD COLUMN     "link_outro" TEXT,
ADD COLUMN     "nome_outro" VARCHAR(100);

-- CreateIndex
CREATE INDEX "bairros_cep_idx" ON "bairros"("cep");
