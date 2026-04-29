-- CreateEnum
CREATE TYPE "Origem" AS ENUM ('SITE', 'WHATSAPP', 'MINERACAO', 'INDICACAO', 'CAMPANHA');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'CONFIRMADO', 'PREPARANDO', 'SAIU_ENTREGA', 'ENTREGUE', 'CANCELADO');

-- CreateTable
CREATE TABLE "clientes" (
    "telefone" VARCHAR(20) NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "endereco" TEXT NOT NULL,
    "bairro" VARCHAR(100) NOT NULL,
    "origem" "Origem" NOT NULL DEFAULT 'SITE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("telefone")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "midia" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" VARCHAR(100) NOT NULL,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bairros" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "taxa" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bairros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "cliente_telefone" VARCHAR(20) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxa_entrega" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "pagamento_id" VARCHAR(255),
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unit" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas_tecnicas" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "custo_producao" DECIMAL(10,2) NOT NULL,
    "margem_alvo" DECIMAL(5,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredientes_ficha" (
    "id" TEXT NOT NULL,
    "ficha_tecnica_id" TEXT NOT NULL,
    "ingrediente" VARCHAR(255) NOT NULL,
    "quantidade_usada" DECIMAL(10,3) NOT NULL,
    "unidade" VARCHAR(20) NOT NULL,
    "custo_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ingredientes_ficha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicacoes" (
    "id" TEXT NOT NULL,
    "indicador_telefone" VARCHAR(20) NOT NULL,
    "indicado_telefone" VARCHAR(20) NOT NULL,
    "codigo_indicacao" VARCHAR(50) NOT NULL,
    "bonificado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roleta_giros" (
    "id" TEXT NOT NULL,
    "cliente_telefone" VARCHAR(20) NOT NULL,
    "premio" VARCHAR(255) NOT NULL,
    "utilizado" BOOLEAN NOT NULL DEFAULT false,
    "data_expiracao" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roleta_giros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos_minerados" (
    "id" TEXT NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "nome" VARCHAR(255),
    "endereco" TEXT,
    "bairro" VARCHAR(100),
    "fonte" VARCHAR(100) NOT NULL,
    "abordado" BOOLEAN NOT NULL DEFAULT false,
    "convertido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contatos_minerados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clientes_bairro_idx" ON "clientes"("bairro");

-- CreateIndex
CREATE INDEX "clientes_origem_idx" ON "clientes"("origem");

-- CreateIndex
CREATE INDEX "produtos_categoria_idx" ON "produtos"("categoria");

-- CreateIndex
CREATE INDEX "produtos_disponivel_idx" ON "produtos"("disponivel");

-- CreateIndex
CREATE INDEX "produtos_ordem_idx" ON "produtos"("ordem");

-- CreateIndex
CREATE UNIQUE INDEX "bairros_nome_key" ON "bairros"("nome");

-- CreateIndex
CREATE INDEX "bairros_ativo_idx" ON "bairros"("ativo");

-- CreateIndex
CREATE INDEX "pedidos_cliente_telefone_idx" ON "pedidos"("cliente_telefone");

-- CreateIndex
CREATE INDEX "pedidos_status_idx" ON "pedidos"("status");

-- CreateIndex
CREATE INDEX "pedidos_criado_em_idx" ON "pedidos"("criado_em");

-- CreateIndex
CREATE INDEX "itens_pedido_pedido_id_idx" ON "itens_pedido"("pedido_id");

-- CreateIndex
CREATE INDEX "itens_pedido_produto_id_idx" ON "itens_pedido"("produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "fichas_tecnicas_produto_id_key" ON "fichas_tecnicas"("produto_id");

-- CreateIndex
CREATE INDEX "ingredientes_ficha_ficha_tecnica_id_idx" ON "ingredientes_ficha"("ficha_tecnica_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicacoes_indicado_telefone_key" ON "indicacoes"("indicado_telefone");

-- CreateIndex
CREATE UNIQUE INDEX "indicacoes_codigo_indicacao_key" ON "indicacoes"("codigo_indicacao");

-- CreateIndex
CREATE INDEX "indicacoes_indicador_telefone_idx" ON "indicacoes"("indicador_telefone");

-- CreateIndex
CREATE INDEX "indicacoes_codigo_indicacao_idx" ON "indicacoes"("codigo_indicacao");

-- CreateIndex
CREATE INDEX "roleta_giros_cliente_telefone_idx" ON "roleta_giros"("cliente_telefone");

-- CreateIndex
CREATE INDEX "roleta_giros_utilizado_idx" ON "roleta_giros"("utilizado");

-- CreateIndex
CREATE UNIQUE INDEX "contatos_minerados_telefone_key" ON "contatos_minerados"("telefone");

-- CreateIndex
CREATE INDEX "contatos_minerados_abordado_idx" ON "contatos_minerados"("abordado");

-- CreateIndex
CREATE INDEX "contatos_minerados_convertido_idx" ON "contatos_minerados"("convertido");

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_telefone_fkey" FOREIGN KEY ("cliente_telefone") REFERENCES "clientes"("telefone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_tecnicas" ADD CONSTRAINT "fichas_tecnicas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredientes_ficha" ADD CONSTRAINT "ingredientes_ficha_ficha_tecnica_id_fkey" FOREIGN KEY ("ficha_tecnica_id") REFERENCES "fichas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_indicador_telefone_fkey" FOREIGN KEY ("indicador_telefone") REFERENCES "clientes"("telefone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_indicado_telefone_fkey" FOREIGN KEY ("indicado_telefone") REFERENCES "clientes"("telefone") ON DELETE RESTRICT ON UPDATE CASCADE;
