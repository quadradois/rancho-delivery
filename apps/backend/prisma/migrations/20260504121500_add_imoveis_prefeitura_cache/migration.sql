CREATE TABLE "imoveis_prefeitura" (
  "id" TEXT NOT NULL,
  "object_id" INTEGER,
  "nrinscr" VARCHAR(14) NOT NULL,
  "instatus" INTEGER,
  "inposfisc" INTEGER,
  "cdlogradou" INTEGER,
  "tplogradou" VARCHAR(10),
  "nmlogradou" VARCHAR(100),
  "nrimovel" VARCHAR(20),
  "incompl" VARCHAR(50),
  "nrquadra" VARCHAR(20),
  "nrlote" VARCHAR(20),
  "cdbairro" INTEGER,
  "nmbairro" VARCHAR(100),
  "cdedificio" INTEGER,
  "nmedificio" VARCHAR(100),
  "raw" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "imoveis_prefeitura_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "imoveis_prefeitura_object_id_key" ON "imoveis_prefeitura"("object_id");
CREATE UNIQUE INDEX "imoveis_prefeitura_nrinscr_key" ON "imoveis_prefeitura"("nrinscr");
CREATE INDEX "imoveis_prefeitura_nmbairro_idx" ON "imoveis_prefeitura"("nmbairro");
CREATE INDEX "imoveis_prefeitura_nmlogradou_idx" ON "imoveis_prefeitura"("nmlogradou");
CREATE INDEX "imoveis_prefeitura_nmedificio_idx" ON "imoveis_prefeitura"("nmedificio");
CREATE INDEX "imoveis_prefeitura_cdbairro_idx" ON "imoveis_prefeitura"("cdbairro");
