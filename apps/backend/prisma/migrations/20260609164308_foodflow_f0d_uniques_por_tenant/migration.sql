-- FoodFlow F0d — unicidade por tenant.
-- Troca uniques GLOBAIS (telefone/cpf_cnpj) por compostos (tenant_id, X):
-- dois tenants podem ter o mesmo telefone/cpf. NOT NULL de tenant_id fica
-- para a F1b (RLS WITH CHECK), pois NOT NULL no schema conflita com o $extends.

-- DropIndex
DROP INDEX "contatos_minerados_telefone_key";

-- DropIndex
DROP INDEX "motoboys_telefone_key";

-- DropIndex
DROP INDEX "leads_marketing_telefone_key";

-- DropIndex
DROP INDEX "leads_marketing_cpf_cnpj_key";

-- CreateIndex
CREATE UNIQUE INDEX "contatos_minerados_tenant_id_telefone_key" ON "contatos_minerados"("tenant_id", "telefone");

-- CreateIndex
CREATE UNIQUE INDEX "motoboys_tenant_id_telefone_key" ON "motoboys"("tenant_id", "telefone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_marketing_tenant_id_telefone_key" ON "leads_marketing"("tenant_id", "telefone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_marketing_tenant_id_cpf_cnpj_key" ON "leads_marketing"("tenant_id", "cpf_cnpj");

