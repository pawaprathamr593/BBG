import { Injectable, signal } from '@angular/core';

/**
 * Holds only permission codes received from a verified backend contract.
 * No role or permission is inferred from a user's profile or URL.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly permissionState = signal<ReadonlySet<string>>(new Set());
  readonly permissions = this.permissionState.asReadonly();

  has(permission: string): boolean {
    return permission.trim().length > 0 && this.permissionState().has(permission);
  }

  hasAll(permissions: readonly string[]): boolean {
    return permissions.length > 0 && permissions.every((permission) => this.has(permission));
  }

  /**
   * Call only after a server response has been validated against the approved
   * permissions DTO. The current backend permission response is not yet
   * approved as a frontend contract, so no bootstrap call is made yet.
   */
  replaceFromVerifiedResponse(permissions: readonly string[]): void {
    this.permissionState.set(new Set(permissions.filter((value) => value.trim().length > 0)));
  }

  clear(): void {
    this.permissionState.set(new Set());
  }
}
