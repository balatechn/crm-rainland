import { Role } from '@prisma/client';

/** Roles that see all branches */
export const HO_ROLES: Role[] = [Role.ADMIN, Role.CRM_MANAGER, Role.SALES_HEAD, Role.CALL_CENTER];

export function branchScopeWhere(user: { role: Role; branchId?: string | null }) {
  if (HO_ROLES.includes(user.role)) return {};
  if (!user.branchId) return { branchId: '__none__' };
  return { branchId: user.branchId };
}
