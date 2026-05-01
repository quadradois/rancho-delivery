CREATE TYPE "OrigemMensagem" AS ENUM ('HUMANO', 'SISTEMA', 'IA');

CREATE TABLE "mensagens_cliente" (
  "id" TEXT NOT NULL,
  "cliente_telefone" VARCHAR(20) NOT NULL,
  "pedido_id" TEXT,
  "origem" "OrigemMensagem" NOT NULL,
  "texto" TEXT NOT NULL,
  "lida" BOOLEAN NOT NULL DEFAULT false,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mensagens_cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lista_negra_clientes" (
  "id" TEXT NOT NULL,
  "cliente_telefone" VARCHAR(20) NOT NULL,
  "motivo" TEXT NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lista_negra_clientes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lista_negra_clientes_cliente_telefone_key" ON "lista_negra_clientes"("cliente_telefone");
CREATE INDEX "mensagens_cliente_cliente_telefone_idx" ON "mensagens_cliente"("cliente_telefone");
CREATE INDEX "mensagens_cliente_origem_idx" ON "mensagens_cliente"("origem");
CREATE INDEX "mensagens_cliente_lida_idx" ON "mensagens_cliente"("lida");
CREATE INDEX "mensagens_cliente_criado_em_idx" ON "mensagens_cliente"("criado_em");
CREATE INDEX "lista_negra_clientes_criado_em_idx" ON "lista_negra_clientes"("criado_em");

ALTER TABLE "mensagens_cliente"
  ADD CONSTRAINT "mensagens_cliente_cliente_telefone_fkey"
  FOREIGN KEY ("cliente_telefone")
  REFERENCES "clientes"("telefone")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "mensagens_cliente"
  ADD CONSTRAINT "mensagens_cliente_pedido_id_fkey"
  FOREIGN KEY ("pedido_id")
  REFERENCES "pedidos"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "lista_negra_clientes"
  ADD CONSTRAINT "lista_negra_clientes_cliente_telefone_fkey"
  FOREIGN KEY ("cliente_telefone")
  REFERENCES "clientes"("telefone")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
