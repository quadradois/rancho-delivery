-- Captura completa do Detalhe Geo360 + controle de enriquecimento (idempotência/backfill)
-- AlterTable: novas colunas (todas nuláveis, exceto versao_enriquecimento com default 0)
ALTER TABLE "imoveis_geo360"
  ADD COLUMN "complemento"           VARCHAR(120),
  ADD COLUMN "logradouro"            VARCHAR(255),
  ADD COLUMN "area_construida"       DOUBLE PRECISION,
  ADD COLUMN "area_terreno"          DOUBLE PRECISION,
  ADD COLUMN "tipo_edificacao"       INTEGER,
  ADD COLUMN "nr_lote"               VARCHAR(20),
  ADD COLUMN "id_bairro"             INTEGER,
  ADD COLUMN "id_quadra"             INTEGER,
  ADD COLUMN "id_setor"              INTEGER,
  ADD COLUMN "raw"                   JSONB,
  ADD COLUMN "versao_enriquecimento" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "detalhe_em"            TIMESTAMP(3);

-- Índice para o filtro de reprocessamento (backfill) ser eficiente sobre milhões de linhas
CREATE INDEX "imoveis_geo360_cidade_versao_enriquecimento_idx" ON "imoveis_geo360"("cidade", "versao_enriquecimento");

-- CreateTable: dicionário de bairros (referência + geometria)
CREATE TABLE "bairros_geo360" (
  "id"               TEXT NOT NULL,
  "cidade"           VARCHAR(50) NOT NULL,
  "id_bairro"        INTEGER NOT NULL,
  "codigo"           VARCHAR(20),
  "nome"             VARCHAR(150),
  "nome_formatado"   VARCHAR(200),
  "codigo_zona"      INTEGER,
  "area_terreno"     DOUBLE PRECISION,
  "area_urbanizavel" DOUBLE PRECISION,
  "geom"             TEXT,
  "atualizado_em"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bairros_geo360_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bairros_geo360_cidade_id_bairro_key" ON "bairros_geo360"("cidade", "id_bairro");
CREATE INDEX "bairros_geo360_cidade_idx" ON "bairros_geo360"("cidade");
CREATE INDEX "bairros_geo360_nome_idx" ON "bairros_geo360"("nome");
