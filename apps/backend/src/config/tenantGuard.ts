import { Prisma } from '@prisma/client';
import { getTenantId, semEscopoAtivo } from './tenantContext';

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
 * - findUnique/findUniqueOrThrow: refaz como findFirst com `where + tenantId`
 *   (qualquer chave única), preservando select/include — esconde registro de
 *   outro tenant sem depender de o select trazer tenantId;
 * - update/delete: confirma a POSSE (findFirst filtrado) antes de tocar o
 *   registro; senão, P2025. Fecha o IDOR de escrita por qualquer chave única.
 *
 * O `where` composto ([tenantId, X]) já carrega o tenant e passa direto.
 *
 * Não cobertos: upsert por chave única GLOBAL (o lookup acharia cross-tenant —
 * resolvido tornando esses uniques compostos [tenantId, X]); `$queryRaw` (o único
 * raw tenant-sensível é o login, cross-tenant de propósito); nested writes
 * (tratados nos services).
 */
export const tenantGuard = Prisma.defineExtension((base) =>
  base.$extends({
    name: 'tenantGuard',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Super-admin (control plane): sem escopo de tenant — vê todos os tenants.
          if (semEscopoAtivo()) return query(args);
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
          // where composto que já carrega o tenant ([tenantId, X] vira a chave tenantId_X) já isola.
          const whereJaIsola = Object.keys(where).some((k) => k === 'tenantId' || k.startsWith('tenantId_'));

          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            if (whereJaIsola) return query(args);
            // Refaz como findFirst com o where unique + tenantId, preservando select/include:
            // fecha o IDOR por QUALQUER chave única (id, nome, ...), sem depender do select.
            const found = await baseModel.findFirst({ ...(args as object), where: { ...where, tenantId } });
            if (!found && operation === 'findUniqueOrThrow') recordNotFound();
            return found;
          }

          if (operation === 'update' || operation === 'delete') {
            // Confirma a posse no tenant antes de tocar — fecha o IDOR de escrita por qualquer
            // chave única (id, nome, ...). where composto ([tenantId, X]) já carrega o tenant.
            if (!whereJaIsola) {
              const dono = await baseModel.findFirst({ where: { ...where, tenantId }, select: { id: true } });
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
