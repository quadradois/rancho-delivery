-- Plano: ciclo de cobrança + dias de teste grátis (aditivo; a tabela "planos"
-- foi criada na migration do control plane, então o ALTER é reproduzível do zero).

-- CreateEnum
CREATE TYPE "CicloCobranca" AS ENUM ('MENSAL', 'TRIMESTRAL', 'ANUAL');

-- AlterTable
ALTER TABLE "planos"
  ADD COLUMN "ciclo" "CicloCobranca" NOT NULL DEFAULT 'MENSAL',
  ADD COLUMN "dias_teste" INTEGER NOT NULL DEFAULT 0;
