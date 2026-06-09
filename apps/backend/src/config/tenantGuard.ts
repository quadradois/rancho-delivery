import { Prisma } from '@prisma/client';
import { getTenantId } from './tenantContext';

/**
 * Models isolados por tenant — derivado do próprio schema (todo model que tem
 * o campo `tenantId`). Auto-sincroniza: um model novo com tenantId entra
 * sozinho; tabelas de plataforma (imóveis, assertiva, mineração) ficam de fora
 * por não terem a coluna. Evita lista manual que envelhece.
 */
export const TENANT_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'tenantId'))
    .map((m) => m.name),
);

/** Operações cujo `where` é filtrado pelo tenant atual. */
const WHERE_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

/**
 * Aplica o tenant do contexto aos args de uma operação Prisma. Função pura
 * (sem I/O) para ser testável sem banco.
 *
 * - WHERE_OPS: adiciona `where.tenantId`.
 * - create / createMany: força `tenantId` no(s) data (o contexto sempre vence,
 *   por segurança).
 * - upsert: força `tenantId` no ramo `create` (o registro novo nasce no tenant).
 *
 * Fora de escopo (serão cobertos pela RLS na F1b):
 * - o `where` de upsert/findUnique/update/delete — chave única não aceita
 *   tenantId, então não isola por tenant aqui;
 * - nested writes (ex.: pedido.create com `itens: { create }`) — o $extends
 *   não desce na árvore (tratado no service que faz o nested);
 * - `$queryRaw`/`$executeRaw` — não passam por $allModels.
 */
export function injectTenant(
  model: string | undefined,
  operation: string,
  args: unknown,
  tenantId: string,
): Record<string, unknown> {
  const next = { ...((args as Record<string, unknown>) ?? {}) };
  if (!model || !TENANT_MODELS.has(model)) return next;

  if (WHERE_OPS.has(operation)) {
    next.where = { ...(next.where as Record<string, unknown>), tenantId };
  } else if (operation === 'create') {
    next.data = { ...(next.data as Record<string, unknown>), tenantId };
  } else if (operation === 'createMany') {
    const data = next.data;
    const rows = Array.isArray(data) ? data : [data];
    next.data = rows.map((d) => ({ ...(d as Record<string, unknown>), tenantId }));
  } else if (operation === 'upsert') {
    // só o ramo de criação ganha tenant; o where (unique) e o update operam
    // sobre o registro existente. Isolar o where fica para a RLS (F1b).
    next.create = { ...(next.create as Record<string, unknown>), tenantId };
  }
  return next;
}

/**
 * Extensão do Prisma Client que aplica o tenant guard a todos os models.
 * Lê o tenant do contexto (AsyncLocalStorage) a cada operação.
 */
export const tenantGuard = Prisma.defineExtension({
  name: 'tenantGuard',
  query: {
    $allModels: {
      $allOperations({ model, operation, args, query }) {
        return query(injectTenant(model, operation, args, getTenantId()));
      },
    },
  },
});
