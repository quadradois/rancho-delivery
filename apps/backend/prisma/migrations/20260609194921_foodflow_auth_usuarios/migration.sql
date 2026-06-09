-- FoodFlow auth multi-tenant: tabela de usuarios do painel.
-- email unico GLOBAL (login resolve o tenant antes do contexto).

-- CreateTable
CREATE TABLE "usuarios" (
    "tenant_id" TEXT,
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nome" VARCHAR(255),
    "role" VARCHAR(20) NOT NULL DEFAULT 'admin',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_tenant_id_idx" ON "usuarios"("tenant_id");

