-- FoodFlow: captura de leads do site institucional (foodflow.ia.br).
-- Tabela NOVA (aditiva, reproduzível do zero). Nada existente é alterado.

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "restaurante" VARCHAR(150) NOT NULL,
    "contato" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150),
    "mensagem" TEXT,
    "origem" VARCHAR(40) NOT NULL DEFAULT 'site',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_criado_em_idx" ON "leads"("criado_em");
