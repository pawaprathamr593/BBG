import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-base-url';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

interface PlanRecord {
  [key: string]: unknown;
}

interface PlanEnvelope {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr?: string[];
  data?: { items?: PlanRecord[] };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-marketplace-about',
  imports: [RouterLink, PaginationComponent],
  templateUrl: './marketplace-about.html',
  styleUrl: './marketplace-about.scss',
})
export class MarketplaceAbout implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  readonly plans = signal<PlanRecord[]>([]);
  readonly planPage = signal(1);
  readonly planPageSize = 3;
  readonly visiblePlans = computed<PlanRecord[]>(() => {
    const start = (this.planPage() - 1) * this.planPageSize;
    return this.plans().slice(start, start + this.planPageSize);
  });
  readonly plansLoading = signal(true);
  readonly plansError = signal('');

  ngOnInit(): void {
    void this.loadPlans();
  }

  async loadPlans(): Promise<void> {
    this.plansLoading.set(true);
    this.plansError.set('');
    try {
      const response = await firstValueFrom(
        this.http.post<PlanEnvelope>(`${this.apiBaseUrl}/api/v1/subscriptions/plans/list`, {
          subscriptionParam: { actionType: 'listActivePlans', actionData: {} },
        }),
      );
      if (response.status !== 'SUCCESS')
        throw new Error(response.msgArr?.join(' ') || 'Plans could not be loaded.');
      const data = response.data as { items?: PlanRecord[] } | undefined;
      this.plans.set(data?.items ?? []);
    } catch {
      this.plansError.set(
        'We couldn’t load the available plans right now. Please try again later.',
      );
    } finally {
      this.plansLoading.set(false);
    }
  }

  display(plan: PlanRecord, keys: string[]): string {
    for (const key of keys) {
      const value = plan[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) return value.map((item) => String(item)).join(' · ');
        if (typeof value === 'object')
          return Object.values(value as Record<string, unknown>)
            .map(String)
            .join(' · ');
        return String(value);
      }
    }
    return '';
  }
}
