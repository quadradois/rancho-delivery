-- imoveis_rancho passa a ser chaveada por (cidade, id_lote = id_imobiliario): 1 linha por imóvel real.
-- Em Balneário Camboriú várias unidades (box/vaga) compartilham a MESMA inscrição cartográfica,
-- então a inscrição NÃO pode ser a chave única. id_lote é não-nulo e único por cidade em toda a base
-- (verificado: goiânia 828.566, aparecida 284.864, 0 nulos, 0 duplicados).

-- 1) id_lote vira obrigatório (0 nulos na base atual)
ALTER TABLE "imoveis_rancho" ALTER COLUMN "id_lote" SET NOT NULL;

-- 2) inscrição deixa de ser única, mas continua indexada para consultas
DROP INDEX "imoveis_rancho_cidade_inscricao_cartografica_key";
CREATE INDEX "imoveis_rancho_cidade_inscricao_cartografica_idx" ON "imoveis_rancho"("cidade", "inscricao_cartografica");

-- 3) nova chave única natural
CREATE UNIQUE INDEX "imoveis_rancho_cidade_id_lote_key" ON "imoveis_rancho"("cidade", "id_lote");
