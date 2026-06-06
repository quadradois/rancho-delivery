-- Renomeia as tabelas e índices de *_geo360 para *_rancho (desassociação do fornecedor).
-- Operação de metadado (instantânea), preserva todos os dados.

ALTER TABLE "imoveis_geo360" RENAME TO "imoveis_rancho";
ALTER TABLE "bairros_geo360" RENAME TO "bairros_rancho";

-- Índices/constraints de imoveis
ALTER INDEX "imoveis_geo360_pkey" RENAME TO "imoveis_rancho_pkey";
ALTER INDEX "imoveis_geo360_cidade_inscricao_cartografica_key" RENAME TO "imoveis_rancho_cidade_inscricao_cartografica_key";
ALTER INDEX "imoveis_geo360_cidade_idx" RENAME TO "imoveis_rancho_cidade_idx";
ALTER INDEX "imoveis_geo360_cpf_cnpj_idx" RENAME TO "imoveis_rancho_cpf_cnpj_idx";
ALTER INDEX "imoveis_geo360_bairro_idx" RENAME TO "imoveis_rancho_bairro_idx";
ALTER INDEX "imoveis_geo360_cep_idx" RENAME TO "imoveis_rancho_cep_idx";
ALTER INDEX "imoveis_geo360_cidade_versao_enriquecimento_idx" RENAME TO "imoveis_rancho_cidade_versao_enriquecimento_idx";

-- Índices/constraints de bairros
ALTER INDEX "bairros_geo360_pkey" RENAME TO "bairros_rancho_pkey";
ALTER INDEX "bairros_geo360_cidade_id_bairro_key" RENAME TO "bairros_rancho_cidade_id_bairro_key";
ALTER INDEX "bairros_geo360_cidade_idx" RENAME TO "bairros_rancho_cidade_idx";
ALTER INDEX "bairros_geo360_nome_idx" RENAME TO "bairros_rancho_nome_idx";
