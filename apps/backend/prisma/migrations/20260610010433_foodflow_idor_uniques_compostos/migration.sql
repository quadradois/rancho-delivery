-- FoodFlow: uniques por-tenant em ConfiguracaoAlerta.tipo e RelatorioDia.data.
-- Fecha o IDOR de upsert por chave unica GLOBAL (o lookup achava cross-tenant).
-- DROP robusto: o unique antigo pode ser CONSTRAINT (origem backup) ou INDEX —
-- cobrimos os dois com IF EXISTS, e so entao criamos o indice composto.

-- configuracoes_alerta.tipo: global -> (tenant_id, tipo)
ALTER TABLE "configuracoes_alerta" DROP CONSTRAINT IF EXISTS "configuracoes_alerta_tipo_key";
DROP INDEX IF EXISTS "configuracoes_alerta_tipo_key";

-- relatorios_dia.data: global -> (tenant_id, data)
ALTER TABLE "relatorios_dia" DROP CONSTRAINT IF EXISTS "relatorios_dia_data_key";
DROP INDEX IF EXISTS "relatorios_dia_data_key";

CREATE UNIQUE INDEX "configuracoes_alerta_tenant_id_tipo_key" ON "configuracoes_alerta"("tenant_id", "tipo");
CREATE UNIQUE INDEX "relatorios_dia_tenant_id_data_key" ON "relatorios_dia"("tenant_id", "data");
