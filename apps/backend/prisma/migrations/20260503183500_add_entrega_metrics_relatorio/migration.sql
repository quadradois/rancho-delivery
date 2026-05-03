DO $$
BEGIN
  IF to_regclass('public.relatorios_dia') IS NULL THEN
    CREATE TABLE public.relatorios_dia (
      id TEXT PRIMARY KEY,
      data DATE NOT NULL UNIQUE,
      pedidos_recebidos INTEGER NOT NULL,
      pedidos_entregues INTEGER NOT NULL,
      pedidos_cancelados INTEGER NOT NULL,
      motivos_cancelamento JSONB,
      tempo_medio_preparo INTEGER,
      tempo_medio_entrega INTEGER,
      receita_bruta DECIMAL(10,2) NOT NULL,
      ticket_medio DECIMAL(10,2) NOT NULL,
      receita_ontem DECIMAL(10,2),
      mensagens_respondidas INTEGER NOT NULL,
      mensagens_total INTEGER NOT NULL,
      pior_horario VARCHAR(20),
      produto_mais_vendido VARCHAR(255),
      entregas_realizadas INTEGER NOT NULL DEFAULT 0,
      taxa_entrega_total DECIMAL(10,2) NOT NULL DEFAULT 0,
      entregas_por_responsavel JSONB,
      entregas_por_hora JSONB,
      criado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS relatorios_dia_data_idx ON public.relatorios_dia (data);
  ELSE
    ALTER TABLE public.relatorios_dia
      ADD COLUMN IF NOT EXISTS entregas_realizadas INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS taxa_entrega_total DECIMAL(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS entregas_por_responsavel JSONB,
      ADD COLUMN IF NOT EXISTS entregas_por_hora JSONB;
  END IF;
END
$$;
