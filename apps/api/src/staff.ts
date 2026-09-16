import type { FastifyInstance, FastifyRequest } from 'fastify';
import { withTenant } from '@bigant/database';
import { DomainError } from '@bigant/core';
import type { StaffClaims } from '@bigant/types';
export async function withStaff<T>(app:FastifyInstance,request:FastifyRequest,work:(claims:StaffClaims)=>Promise<T>):Promise<T> {
  let claims:StaffClaims;
  try { claims=await app.authenticateStaff(request); }
  catch { throw new DomainError('UNAUTHORIZED',401); }
  return withTenant(claims.tenant_id,()=>work(claims));
}
