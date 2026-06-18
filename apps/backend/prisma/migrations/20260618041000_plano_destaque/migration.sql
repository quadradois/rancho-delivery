-- Plano: marcar manualmente como "Mais popular" (destaque no card). Aditivo.
ALTER TABLE "planos" ADD COLUMN "destaque" BOOLEAN NOT NULL DEFAULT false;
