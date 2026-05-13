CREATE TABLE IF NOT EXISTS "assertiva_consultas_cache" (
  "id" TEXT NOT NULL,
  "cpf_cnpj" VARCHAR(14) NOT NULL,
  "tipo_documento" VARCHAR(4) NOT NULL,
  "telefones" JSONB,
  "emails" JSONB,
  "raw" JSONB,
  "fonte" VARCHAR(40) NOT NULL DEFAULT 'ASSERTIVA',
  "consultado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expira_em" TIMESTAMP(3) NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assertiva_consultas_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "assertiva_consultas_cache_cpf_cnpj_key" ON "assertiva_consultas_cache"("cpf_cnpj");
CREATE INDEX IF NOT EXISTS "assertiva_consultas_cache_expira_em_idx" ON "assertiva_consultas_cache"("expira_em");
CREATE INDEX IF NOT EXISTS "assertiva_consultas_cache_consultado_em_idx" ON "assertiva_consultas_cache"("consultado_em");
