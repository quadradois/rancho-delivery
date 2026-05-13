CREATE TYPE "LeadStatus" AS ENUM ('ATIVO', 'CONVERTIDO', 'INVALIDO', 'OPT_OUT');
CREATE TYPE "CampanhaStatus" AS ENUM ('RASCUNHO', 'ENVIANDO', 'CONCLUIDA', 'FALHA');

CREATE TABLE "leads_marketing" (
  "id" TEXT NOT NULL,
  "telefone" VARCHAR(20) NOT NULL,
  "nome" VARCHAR(255),
  "endereco" TEXT,
  "bairro" VARCHAR(100),
  "origem_mineracao" VARCHAR(255) NOT NULL,
  "status" "LeadStatus" NOT NULL DEFAULT 'ATIVO',
  "notas" TEXT,
  "convertido_em" TIMESTAMP(3),
  "cliente_telefone" VARCHAR(20),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leads_marketing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "execucoes_mineracao" (
  "id" TEXT NOT NULL,
  "run_id" VARCHAR(64) NOT NULL,
  "modo" VARCHAR(40) NOT NULL,
  "termo" VARCHAR(255) NOT NULL,
  "filtros" JSONB,
  "status" VARCHAR(40) NOT NULL,
  "erro" TEXT,
  "total_imoveis" INTEGER NOT NULL DEFAULT 0,
  "total_iptus" INTEGER NOT NULL DEFAULT 0,
  "contatos_gerados" INTEGER NOT NULL DEFAULT 0,
  "contatos_uteis" INTEGER NOT NULL DEFAULT 0,
  "duracoes" JSONB,
  "criado_por" VARCHAR(100),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "execucoes_mineracao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campanhas_marketing" (
  "id" TEXT NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "mensagem" TEXT NOT NULL,
  "filtro" JSONB,
  "status" "CampanhaStatus" NOT NULL DEFAULT 'RASCUNHO',
  "criado_por" VARCHAR(100),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  "enviada_em" TIMESTAMP(3),
  "erro" TEXT,
  CONSTRAINT "campanhas_marketing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campanhas_destinatarios" (
  "id" TEXT NOT NULL,
  "campanha_id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "status_envio" VARCHAR(40) NOT NULL,
  "motivo_falha" TEXT,
  "enviado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campanhas_destinatarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leads_marketing_telefone_key" ON "leads_marketing"("telefone");
CREATE INDEX "leads_marketing_status_idx" ON "leads_marketing"("status");
CREATE INDEX "leads_marketing_origem_mineracao_idx" ON "leads_marketing"("origem_mineracao");
CREATE INDEX "leads_marketing_bairro_idx" ON "leads_marketing"("bairro");

CREATE UNIQUE INDEX "execucoes_mineracao_run_id_key" ON "execucoes_mineracao"("run_id");
CREATE INDEX "execucoes_mineracao_criado_em_idx" ON "execucoes_mineracao"("criado_em");

CREATE INDEX "campanhas_marketing_status_idx" ON "campanhas_marketing"("status");
CREATE INDEX "campanhas_marketing_criado_em_idx" ON "campanhas_marketing"("criado_em");

CREATE UNIQUE INDEX "campanhas_destinatarios_campanha_id_lead_id_key" ON "campanhas_destinatarios"("campanha_id", "lead_id");
CREATE INDEX "campanhas_destinatarios_status_envio_idx" ON "campanhas_destinatarios"("status_envio");

ALTER TABLE "leads_marketing"
ADD CONSTRAINT "leads_marketing_cliente_telefone_fkey"
FOREIGN KEY ("cliente_telefone") REFERENCES "clientes"("telefone") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "campanhas_destinatarios"
ADD CONSTRAINT "campanhas_destinatarios_campanha_id_fkey"
FOREIGN KEY ("campanha_id") REFERENCES "campanhas_marketing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campanhas_destinatarios"
ADD CONSTRAINT "campanhas_destinatarios_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "leads_marketing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
