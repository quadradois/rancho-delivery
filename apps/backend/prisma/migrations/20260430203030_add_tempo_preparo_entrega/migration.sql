-- AlterTable
ALTER TABLE "bairros" ADD COLUMN     "tempo_entrega" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "tempo_preparo" INTEGER NOT NULL DEFAULT 15;
