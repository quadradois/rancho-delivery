-- CreateTable
CREATE TABLE "scraper_erros" (
    "id" TEXT NOT NULL,
    "nrinscr" VARCHAR(14) NOT NULL,
    "run_id" VARCHAR(64) NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 1,
    "ultimoErro" TEXT NOT NULL,
    "http_status" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraper_erros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scraper_erros_run_id_idx" ON "scraper_erros"("run_id");

-- CreateIndex
CREATE INDEX "scraper_erros_criado_em_idx" ON "scraper_erros"("criado_em");
