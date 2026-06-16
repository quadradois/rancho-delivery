-- FoodFlow Control Plane: módulos, planos, assinaturas (entitlements).
-- Tudo tabela NOVA (aditivo, reproduzível do zero). Nada existente é alterado.

-- CreateEnum
CREATE TYPE "EstadoConta" AS ENUM ('TESTE', 'ATIVA', 'INADIMPLENTE', 'CANCELADA');

-- CreateTable
CREATE TABLE "modulos" (
    "id" TEXT NOT NULL,
    "chave" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "preco_avulso" DECIMAL(10,2),
    "core" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "modulos_chave_key" ON "modulos"("chave");

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "publico" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_modulos" (
    "plano_id" TEXT NOT NULL,
    "modulo_id" TEXT NOT NULL,
    CONSTRAINT "plano_modulos_pkey" PRIMARY KEY ("plano_id","modulo_id")
);
CREATE INDEX "plano_modulos_modulo_id_idx" ON "plano_modulos"("modulo_id");

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plano_id" TEXT,
    "estado" "EstadoConta" NOT NULL DEFAULT 'ATIVA',
    "provedor_ref" VARCHAR(255),
    "trial_ate" TIMESTAMP(3),
    "proxima_cobranca" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "assinaturas_tenant_id_key" ON "assinaturas"("tenant_id");
CREATE INDEX "assinaturas_estado_idx" ON "assinaturas"("estado");
CREATE INDEX "assinaturas_plano_id_idx" ON "assinaturas"("plano_id");

-- CreateTable
CREATE TABLE "assinatura_modulos" (
    "assinatura_id" TEXT NOT NULL,
    "modulo_id" TEXT NOT NULL,
    CONSTRAINT "assinatura_modulos_pkey" PRIMARY KEY ("assinatura_id","modulo_id")
);
CREATE INDEX "assinatura_modulos_modulo_id_idx" ON "assinatura_modulos"("modulo_id");

-- AddForeignKey
ALTER TABLE "plano_modulos" ADD CONSTRAINT "plano_modulos_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plano_modulos" ADD CONSTRAINT "plano_modulos_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assinatura_modulos" ADD CONSTRAINT "assinatura_modulos_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinatura_modulos" ADD CONSTRAINT "assinatura_modulos_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
