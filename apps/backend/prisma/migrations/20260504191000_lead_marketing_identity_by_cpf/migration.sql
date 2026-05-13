ALTER TABLE "leads_marketing"
  ADD COLUMN IF NOT EXISTS "cpf_cnpj" VARCHAR(14),
  ADD COLUMN IF NOT EXISTS "telefones" JSONB;

UPDATE "leads_marketing"
SET "telefones" = jsonb_build_array("telefone")
WHERE "telefones" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "leads_marketing_cpf_cnpj_key" ON "leads_marketing"("cpf_cnpj");
