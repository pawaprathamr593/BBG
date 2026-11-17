import { Component, effect, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { ApiError } from '../../core/http/api-error';
import { ApiEnvelope } from '../../core/http/api.models';
import { WorkspaceContextService } from './workspace-context.service';

@Component({
  selector: 'app-workspace-overview',
  templateUrl: './workspace-overview.html',
  styleUrl: './workspace-overview.scss',
})
export class WorkspaceOverview {
  private readonly api = inject(ApiService);
  private readonly workspace = inject(WorkspaceContextService);
  protected readonly mode = this.workspace.mode;
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly metrics = signal<Record<string, unknown>>({});
  protected readonly title = computed(() => this.mode() === 'PERSONAL' ? 'Your activity' : this.mode() === 'BUSINESS' ? 'Business overview' : 'Platform overview');

  private requestSequence = 0;

  constructor() {
    effect(() => {
      this.mode();
      this.workspace.tenantId();
      void this.load();
    });
  }

  protected async load(): Promise<void> {
    const requestId = ++this.requestSequence;
    this.loading.set(true);
    this.error.set('');
    this.metrics.set({});
    const mode = this.mode();
    const tenantId = this.workspace.tenantId();
    if (mode === 'BUSINESS' && !tenantId) {
      if (requestId === this.requestSequence) this.loading.set(false);
      return;
    }
    const route = mode === 'PERSONAL'
      ? '/api/v1/dashboard/consumer/summary'
      : mode === 'BUSINESS'
        ? '/api/v1/dashboard/entrepreneur/summary'
        : '/api/v1/admin/analytics/summary';
    const envelope = mode === 'PERSONAL' || mode === 'BUSINESS' ? 'dashboardParam' : 'adminParam';
    const actionType = mode === 'PERSONAL'
      ? 'getConsumerDashboard'
      : mode === 'BUSINESS'
        ? 'getEntrepreneurDashboard'
        : 'getAdminAnalyticsSummary';
    const actionData: Record<string, unknown> = mode === 'BUSINESS' ? { tenant_id: tenantId } : {};
    try {
      const response = await firstValueFrom(this.api.post<Record<string, unknown>>(route, {
        [envelope]: { actionType, actionData },
      }));
      this.assertSuccess(response);
      if (!response?.data || Array.isArray(response.data) || typeof response.data !== 'object') {
        throw new ApiError('The dashboard response was empty or had an unexpected format.');
      }
      if (requestId === this.requestSequence) this.metrics.set(response.data as Record<string, unknown>);
    } catch (cause) {
      if (requestId === this.requestSequence) this.error.set(cause instanceof Error ? cause.message : 'Unable to load dashboard information.');
    } finally {
      this.loading.set(false);
    }
  }

  protected entries(): Array<[string, unknown]> {
    return Object.entries(this.metrics());
  }

  protected formatLabel(value: string): string {
    return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  protected formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'number') return new Intl.NumberFormat('en-IN').format(value);
    return String(value);
  }

  private assertSuccess<T>(response: ApiEnvelope<T> | null | undefined): asserts response is ApiEnvelope<T> {
    if (!response || response.status !== 'SUCCESS') {
      throw new ApiError(response?.msgArr?.join(' ') || 'Dashboard request failed.');
    }
  }
}
