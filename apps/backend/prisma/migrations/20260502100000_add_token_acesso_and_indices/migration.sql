-- AlterTable: adicionar coluna token_acesso
ALTER TABLE "pedidos" ADD COLUMN "token_acesso" VARCHAR(64);

-- CreateIndex: token_acesso único
CREATE UNIQUE INDEX "pedidos_token_acesso_key" ON "pedidos"("token_acesso");

-- CreateIndex: indices de performance ausentes
CREATE INDEX "pedidos_status_pagamento_idx" ON "pedidos"("status_pagamento");
CREATE INDEX "pedidos_pagamento_expira_em_idx" ON "pedidos"("pagamento_expira_em");
CREATE INDEX "pedidos_estorno_necessario_idx" ON "pedidos"("estorno_necessario");
CREATE INDEX "pedidos_status_criado_em_idx" ON "pedidos"("status", "criado_em");
