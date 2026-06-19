-- F0.1: de-privilegiar o Rancho.
-- O Rancho deixa de depender do fallback implícito (tenant padrão) e passa a
-- resolver pelo próprio domínio, como qualquer outro tenant. Todo tráfego /api
-- do Rancho chega com Host=rancho.delivery (frontend usa NEXT_PUBLIC_API_URL).
-- Idempotente e reproduzível do zero: a migration F0a já cria o tenant 'rancho'
-- (dominio NULL); aqui apenas preenchemos o domínio. No-op se já estiver setado.
UPDATE "tenants" SET "dominio" = 'rancho.delivery'
WHERE "id" = 'rancho' AND "dominio" IS NULL;
