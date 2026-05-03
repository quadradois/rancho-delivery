-- P0 /admin/pedidos: base financeira e tipo de atendimento
-- 1) Extende status de pagamento para contemplar cobrança na entrega
ALTER TYPE "StatusPagamento" ADD VALUE IF NOT EXISTS 'A_RECEBER';

-- 2) Enum de forma de pagamento do pedido
CREATE TYPE "FormaPagamentoPedido" AS ENUM (
  'PIX',
  'DINHEIRO',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO'
);

-- 3) Enum de tipo de atendimento do pedido
CREATE TYPE "TipoAtendimentoPedido" AS ENUM (
  'ENTREGA',
  'RETIRADA',
  'CONSUMO_LOCAL'
);

-- 4) Colunas aditivas com defaults para compatibilidade
ALTER TABLE "pedidos"
ADD COLUMN "forma_pagamento" "FormaPagamentoPedido" NOT NULL DEFAULT 'PIX',
ADD COLUMN "troco_para" DECIMAL(10, 2),
ADD COLUMN "tipo_atendimento" "TipoAtendimentoPedido" NOT NULL DEFAULT 'ENTREGA';
