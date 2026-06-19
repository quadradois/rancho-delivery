-- FoodFlow F0.1 — unicidade de bairro por tenant.
-- Troca o unique GLOBAL de bairros.nome por composto (tenant_id, nome): dois
-- tenants podem ter um bairro com o mesmo nome. Mesma decisão da F0d para os
-- demais models (NOT NULL de tenant_id fica para a F1b/RLS).

-- DropIndex
DROP INDEX "bairros_nome_key";

-- CreateIndex
CREATE UNIQUE INDEX "bairros_tenant_id_nome_key" ON "bairros"("tenant_id", "nome");
