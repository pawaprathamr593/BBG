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
