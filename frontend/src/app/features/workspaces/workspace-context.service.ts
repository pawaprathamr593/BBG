import { Injectable, signal } from '@angular/core';

export type WorkspaceMode = 'PERSONAL' | 'BUSINESS' | 'PLATFORM';

export interface WorkspaceTenant {
  id: number;
  tenant_name: string;
  tenant_code: string;
  tenant_status: string;
  membership_status: string;
  role_codes: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  readonly mode = signal<WorkspaceMode>('PERSONAL');
  readonly tenants = signal<WorkspaceTenant[]>([]);
  readonly tenantId = signal<number | null>(null);

  setTenants(tenants: WorkspaceTenant[]): void {
    this.tenants.set(tenants);
  }

  setMode(mode: WorkspaceMode): void {
    this.mode.set(mode);
  }

  setTenant(tenantId: number | null): void {
    this.tenantId.set(tenantId);
  }
}
