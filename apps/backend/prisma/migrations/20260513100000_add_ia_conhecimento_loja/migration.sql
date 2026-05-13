-- AddColumn: base de conhecimento IA na tabela loja_configuracao
ALTER TABLE "loja_configuracao"
  ADD COLUMN "ia_descricao_negocio" TEXT,
  ADD COLUMN "ia_voz_marca" JSONB,
  ADD COLUMN "ia_diferenciais" JSONB,
  ADD COLUMN "ia_horarios" JSONB,
  ADD COLUMN "ia_politica_frete" TEXT,
  ADD COLUMN "ia_politica_primeiro_pedido" TEXT,
  ADD COLUMN "ia_nome_atendente" VARCHAR(100);
