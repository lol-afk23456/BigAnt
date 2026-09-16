import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, PrismaClient } from '@prisma/client';

const context = new AsyncLocalStorage<string>();
const client = new PrismaClient({ log: [] });
export class TenantScopeError extends Error {}

export function withTenant<T>(tenantId: string, work: () => T | PromiseLike<T>): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) throw new TenantScopeError('TENANT_REQUIRED');
  const current = context.getStore();
  if (current && current !== tenantId) throw new TenantScopeError('TENANT_MISMATCH');
  // Le PrismaPromise sono lazy: consumarle qui mantiene il contesto fino alla query.
  return context.run(tenantId, async () => await work());
}

const readOrWrite = new Set(['findFirst','findFirstOrThrow','findMany','findUnique','findUniqueOrThrow','count','aggregate','groupBy','update','updateMany','updateManyAndReturn','delete','deleteMany']);
const creates = new Set(['create','createMany','createManyAndReturn']);
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TenantScopeError('INVALID_ARGUMENT');
  return value as Record<string, unknown>;
}

export const db = client.$extends({
  name: 'tenant-obbligatorio',
  query: {
    async $allOperations({ model, operation, args, query }) {
      const tenantId = context.getStore();
      if (!tenantId) throw new TenantScopeError('TENANT_REQUIRED');
      if (!model) throw new TenantScopeError('RAW_QUERY_FORBIDDEN');
      const input = record(args ?? {});
      const tenantKey = model === 'Tenant' ? 'id' : 'tenant_id';
      const scope = (where: unknown) => {
        const filter = where === undefined ? {} : record(where);
        if (filter[tenantKey] !== undefined && filter[tenantKey] !== tenantId) throw new TenantScopeError('TENANT_MISMATCH');
        return { ...filter, [tenantKey]: tenantId };
      };
      const prepareData = (value: unknown, creating: boolean): unknown => {
        if (Array.isArray(value)) return value.map(item => prepareData(item, creating));
        const data = record(value);
        const definition = Prisma.dmmf.datamodel.models.find(entry => entry.name === model);
        for (const field of definition?.fields ?? []) {
          // Le scritture annidate saltano gli hook Prisma: usare FK scalari composte.
          if (field.kind === 'object' && field.name in data) throw new TenantScopeError('NESTED_WRITE_FORBIDDEN');
        }
        if (model === 'Tenant' && (creating || 'slug' in data || 'id' in data)) throw new TenantScopeError('TENANT_IDENTITY_IMMUTABLE');
        if (model !== 'Tenant' && 'tenant_id' in data && data.tenant_id !== tenantId) throw new TenantScopeError('TENANT_MISMATCH');
        if (!creating && ('id' in data || 'tenant_id' in data)) throw new TenantScopeError('TENANT_IDENTITY_IMMUTABLE');
        return creating ? { ...data, [tenantKey]: tenantId } : data;
      };
      if (readOrWrite.has(operation)) {
        input.where = scope(input.where);
        if ('data' in input) input.data = prepareData(input.data, false);
      } else if (creates.has(operation)) {
        input.data = prepareData(input.data, true);
      } else if (operation === 'upsert') {
        input.where = scope(input.where);
        input.create = prepareData(input.create, true);
        input.update = prepareData(input.update, false);
      } else throw new TenantScopeError('OPERATION_FORBIDDEN');
      return query(input as typeof args);
    },
  },
});

// Unica risoluzione pre-autenticazione: restituisce soltanto l'identità dello slug.
export async function resolveTenant(slug: string) {
  return client.tenant.findUnique({ where: { slug }, select: { id: true, status: true } });
}
export async function disconnectDatabase() { await client.$disconnect(); }
