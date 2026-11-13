import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from './permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const permissions = inject(PermissionService);
  const requiredPermission = route.data['requiredPermission'];

  if (typeof requiredPermission !== 'string' || requiredPermission.trim() === '') {
    return router.createUrlTree(['/access-denied']);
  }

  return permissions.has(requiredPermission)
    ? true
    : router.createUrlTree(['/access-denied']);
};
