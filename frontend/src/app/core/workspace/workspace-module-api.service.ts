import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { WorkspaceContextService } from './workspace-context.service';

interface ApiEnvelope<T> { status: 'SUCCESS' | 'FAILED' | 'EXCEPTION'; msgArr?: string[]; data?: T; }

@Injectable({ providedIn: 'root' })
export class WorkspaceModuleApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly workspace = inject(WorkspaceContextService);

  async request<T>(path: string, actionType: string, actionData: Record<string, unknown>): Promise<T> {
    const tenantId = this.workspace.activeTenantId();
    const context = this.workspace.activeContext();
    const response = await firstValueFrom(this.http.post<ApiEnvelope<T>>(
      this.apiBaseUrl + path, { businessParam: { actionType, actionData } },
    ));
    if (tenantId !== this.workspace.activeTenantId() || context !== this.workspace.activeContext()) {
      throw new Error('Your workspace changed. Refresh this section and try again.');
    }
    if (response.status !== 'SUCCESS') throw new Error(response.msgArr?.join(' ') || 'The request could not be completed.');
    return response.data as T;
  }
}
