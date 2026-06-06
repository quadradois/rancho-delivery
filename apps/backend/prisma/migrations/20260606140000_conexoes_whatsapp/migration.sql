-- Conexões de WhatsApp (instâncias Evolution Go). Uma marcada como principal.
CREATE TABLE "conexoes_whatsapp" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "instance_id" VARCHAR(100),
    "telefone" VARCHAR(20),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "conectado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conexoes_whatsapp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conexoes_whatsapp_nome_key" ON "conexoes_whatsapp"("nome");
CREATE INDEX "conexoes_whatsapp_principal_idx" ON "conexoes_whatsapp"("principal");
