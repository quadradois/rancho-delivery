-- Central de Decisoes - alertas operacionais persistentes

CREATE TYPE "TipoAlertaOperacional" AS ENUM (
  'PEDIDO_PAGO_SEM_CONFIRMACAO',
  'CLIENTE_SEM_RESPOSTA',
  'PREPARO_ATRASADO',
  'PEDIDO_SEM_ENTREGADOR',
  'ESTORNO_NECESSARIO',
  'WHATSAPP_INDISPONIVEL',
  'FALHA_ENVIO_WHATSAPP',
  'ENDERECO_DUVIDOSO'
);

CREATE TYPE "SeveridadeAlerta" AS ENUM ('INFO', 'ATENCAO', 'CRITICO');

CREATE TYPE "StatusAlerta" AS ENUM ('ABERTO', 'EM_TRATAMENTO', 'RESOLVIDO', 'IGNORADO');

CREATE TYPE "AcaoRecomendada" AS ENUM (
  'CONFIRMAR_PEDIDO',
  'RESPONDER_CLIENTE',
  'VERIFICAR_COZINHA',
  'ATRIBUIR_ENTREGADOR',
  'MARCAR_ESTORNO',
  'RECONECTAR_WHATSAPP',
  'REVISAR_ENDERECO',
  'ACOMPANHAR'
);

CREATE TABLE "alertas_operacionais" (
  "id" TEXT NOT NULL,
  "tipo" "TipoAlertaOperacional" NOT NULL,
  "severidade" "SeveridadeAlerta" NOT NULL,
  "status" "StatusAlerta" NOT NULL DEFAULT 'ABERTO',
  "pedido_id" TEXT,
  "cliente_telefone" VARCHAR(20),
  "titulo" VARCHAR(120) NOT NULL,
  "descricao" TEXT NOT NULL,
  "motivo" TEXT NOT NULL,
  "proxima_acao" "AcaoRecomendada" NOT NULL,
  "acao_payload" JSONB,
  "dedupe_key" VARCHAR(180) NOT NULL,
  "detectado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvido_em" TIMESTAMP(3),
  "resolvido_por" VARCHAR(80),
  "resolucao_motivo" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "alertas_operacionais_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "alertas_operacionais_dedupe_key_key" ON "alertas_operacionais"("dedupe_key");
CREATE INDEX "alertas_operacionais_status_severidade_detectado_em_idx" ON "alertas_operacionais"("status", "severidade", "detectado_em");
CREATE INDEX "alertas_operacionais_pedido_id_idx" ON "alertas_operacionais"("pedido_id");
CREATE INDEX "alertas_operacionais_cliente_telefone_idx" ON "alertas_operacionais"("cliente_telefone");
CREATE INDEX "alertas_operacionais_tipo_idx" ON "alertas_operacionais"("tipo");

ALTER TABLE "alertas_operacionais"
  ADD CONSTRAINT "alertas_operacionais_pedido_id_fkey"
  FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alertas_operacionais"
  ADD CONSTRAINT "alertas_operacionais_cliente_telefone_fkey"
  FOREIGN KEY ("cliente_telefone") REFERENCES "clientes"("telefone") ON DELETE SET NULL ON UPDATE CASCADE;
