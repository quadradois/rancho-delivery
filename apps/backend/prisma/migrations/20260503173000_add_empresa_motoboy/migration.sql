DO $$ BEGIN
  CREATE TYPE "EmpresaEntrega" AS ENUM ('PROPRIO', 'IFOOD', 'MUVE', 'FOOD99');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "motoboys"
  ADD COLUMN IF NOT EXISTS "empresa" "EmpresaEntrega" NOT NULL DEFAULT 'PROPRIO';
