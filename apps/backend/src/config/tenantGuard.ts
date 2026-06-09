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
 * Aplica o tenant do contexto aos args de uma operação de coleção/criação.
 * Função pura (sem I/O) para ser testável sem banco.
 *
 * - WHERE_OPS: adiciona `where.tenantId`.
 * - create / createMany: força `tenantId` no(s) data (o contexto sempre vence).
 * - upsert: força `tenantId` no ramo `create` (o registro novo nasce no tenant).
 *
 * Operações por chave única (findUnique/update/delete) NÃO são tratadas aqui —
 * são fechadas no hook (validação de resultado / checagem de posse), pois o
 * `where` unique não aceita tenantId.
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
    next.create = { ...(next.create as Record<string, unknown>), tenantId };
  }
  return next;
}

/** Nome do model em camelCase, como exposto no client (Produto -> produto). */
function accessor(model: string): string {
  return model[0].toLowerCase() + model.slice(1);
}

function recordNotFound(): never {
  throw new Prisma.PrismaClientKnownRequestError('Registro nao encontrado para o tenant atual', {
    code: 'P2025',
    clientVersion: Prisma.prismaVersion.client,
  });
}

/**
 * Tenant guard via Prisma Client Extension. Lê o tenant do contexto
 * (AsyncLocalStorage) a cada operação e:
 *
 * - coleção/criação (WHERE_OPS, create/createMany, ramo create do upsert):
 *   injeta o tenant via `injectTenant`;
 * - findUnique/findUniqueOrThrow: como o `where` unique não filtra por tenant,
 *   valida o tenant do RESULTADO (esconde registro de outro tenant);
 * - update/delete: confirma a POSSE antes de tocar o registro — uma busca
 *   filtrada por tenant (no client base) precisa achar a linha; senão, P2025.
 *   Fecha o IDOR de escrita-por-id que o filtro de coleção não cobre.
 *
 * Não cobertos (aceito): `$queryRaw`/`$executeRaw` (o único raw tenant-sensível
 * é o login, cross-tenant de propósito) e nested writes (tratados nos services).
 */
export const tenantGuard = Prisma.defineExtension((base) =>
  base.$extends({
    name: 'tenantGuard',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = getTenantId();
          if (!model || !TENANT_MODELS.has(model)) return query(args);

          if (
            WHERE_OPS.has(operation) ||
            operation === 'create' ||
            operation === 'createMany' ||
            operation === 'upsert'
          ) {
            return query(injectTenant(model, operation, args, tenantId));
          }

          const baseModel = (base as unknown as Record<string, { findFirst: (a: unknown) => Promise<unknown> }>)[
            accessor(model)
          ];
          const where = (args as { where?: Record<string, unknown> })?.where ?? {};

          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            // Por id (vetor do IDOR): refaz como findFirst {id, tenantId}, preservando
            // select/include — robusto mesmo quando o select omite tenantId.
            if (typeof where.id === 'string') {
              const found = await baseModel.findFirst({ ...(args as object), where: { id: where.id, tenantId } });
              if (!found && operation === 'findUniqueOrThrow') recordNotFound();
              return found;
            }
            // Outros uniques: valida pelo tenant do resultado, se presente.
            const res = await query(args);
            const t = (res as { tenantId?: unknown } | null)?.tenantId;
            if (res && t != null && t !== tenantId) {
              if (operation === 'findUniqueOrThrow') recordNotFound();
              return null;
            }
            return res;
          }

          if (operation === 'update' || operation === 'delete') {
            // Por id: confirma a posse no tenant antes de tocar (fecha o IDOR de escrita).
            // Wheres compostos ([tenantId, X]) já carregam o tenant; demais seguem.
            if (typeof where.id === 'string') {
              const dono = await baseModel.findFirst({ where: { id: where.id, tenantId }, select: { id: true } });
              if (!dono) recordNotFound();
            }
            return query(args);
          }

          return query(args);
        },
      },
    },
  }),
);
