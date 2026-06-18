-- Plano: lista de benefícios em texto livre (exibidos no card; separados dos
-- módulos, que continuam definindo o que o plano libera). Aditivo.
ALTER TABLE "planos" ADD COLUMN "beneficios" TEXT[] NOT NULL DEFAULT '{}'::text[];
