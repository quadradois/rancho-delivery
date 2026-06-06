-- Cria as tabelas do cadastro imobiliário (antes existiam só via db push / backup,
-- nunca no histórico de migrations). Consolida a captura completa do detalhe + dicionário de bairros.

-- CreateTable
CREATE TABLE "imoveis_rancho" (
    "id" TEXT NOT NULL,
    "cidade" VARCHAR(50) NOT NULL,
    "inscricao_cartografica" VARCHAR(20) NOT NULL,
    "id_lote" INTEGER,
    "numero_cadastro" INTEGER,
    "cpf_cnpj" VARCHAR(20),
    "nome_pessoa" VARCHAR(255),
    "tipo_pessoa" INTEGER,
    "endereco" TEXT,
    "bairro" VARCHAR(100),
    "cep" VARCHAR(8),
    "complemento" VARCHAR(120),
    "logradouro" VARCHAR(255),
    "area_construida" DOUBLE PRECISION,
    "area_terreno" DOUBLE PRECISION,
    "tipo_edificacao" INTEGER,
    "nr_lote" VARCHAR(20),
    "id_bairro" INTEGER,
    "id_quadra" INTEGER,
    "id_setor" INTEGER,
    "raw" JSONB,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "versao_enriquecimento" INTEGER NOT NULL DEFAULT 0,
    "detalhe_em" TIMESTAMP(3),
    "sincronizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imoveis_rancho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bairros_rancho" (
    "id" TEXT NOT NULL,
    "cidade" VARCHAR(50) NOT NULL,
    "id_bairro" INTEGER NOT NULL,
    "codigo" VARCHAR(20),
    "nome" VARCHAR(150),
    "nome_formatado" VARCHAR(200),
    "codigo_zona" INTEGER,
    "area_terreno" DOUBLE PRECISION,
    "area_urbanizavel" DOUBLE PRECISION,
    "geom" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bairros_rancho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imoveis_rancho_cidade_idx" ON "imoveis_rancho"("cidade");
CREATE INDEX "imoveis_rancho_cpf_cnpj_idx" ON "imoveis_rancho"("cpf_cnpj");
CREATE INDEX "imoveis_rancho_bairro_idx" ON "imoveis_rancho"("bairro");
CREATE INDEX "imoveis_rancho_cep_idx" ON "imoveis_rancho"("cep");
CREATE INDEX "imoveis_rancho_cidade_versao_enriquecimento_idx" ON "imoveis_rancho"("cidade", "versao_enriquecimento");
CREATE UNIQUE INDEX "imoveis_rancho_cidade_inscricao_cartografica_key" ON "imoveis_rancho"("cidade", "inscricao_cartografica");

-- CreateIndex
CREATE INDEX "bairros_rancho_cidade_idx" ON "bairros_rancho"("cidade");
CREATE INDEX "bairros_rancho_nome_idx" ON "bairros_rancho"("nome");
CREATE UNIQUE INDEX "bairros_rancho_cidade_id_bairro_key" ON "bairros_rancho"("cidade", "id_bairro");
