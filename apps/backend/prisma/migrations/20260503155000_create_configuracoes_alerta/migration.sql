CREATE TABLE IF NOT EXISTS "configuracoes_alerta" (
  "id" TEXT NOT NULL,
  "tipo" VARCHAR(60) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "threshold" INTEGER NOT NULL DEFAULT 0,
  "acao" VARCHAR(100) NOT NULL DEFAULT 'som+badge',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "configuracoes_alerta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "configuracoes_alerta_tipo_key" ON "configuracoes_alerta"("tipo");
