import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionScope, PermissionService } from './permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const permissions = inject(PermissionService);
  const requiredPermission = route.data['requiredPermission'];
  const requiredScope = route.data['requiredScope'];

  if (
    typeof requiredPermission !== 'string'
    || requiredPermission.trim() === ''
    || (requiredScope !== 'PLATFORM' && requiredScope !== 'TENANT')
  ) {
    return router.createUrlTree(['/access-denied']);
  }

  return permissions.has(requiredPermission, requiredScope as PermissionScope)
    ? true
    : router.createUrlTree(['/access-denied']);
};

/** Restricts a platform route using the scope in the verified permissions response. */
export const permissionScopeGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const permissions = inject(PermissionService);
  const requiredScope = route.data['requiredScope'];

  if (requiredScope !== 'PLATFORM' && requiredScope !== 'TENANT') {
    return router.createUrlTree(['/access-denied']);
  }

  return permissions.context()?.permissions.some((record) => record.scope_type === requiredScope)
    ? true
    : router.createUrlTree(['/access-denied']);
};
