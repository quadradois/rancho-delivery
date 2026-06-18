-- Plano: ordem de exibição (drag-and-drop no admin). Aditivo.
ALTER TABLE "planos" ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;
