import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-subscription-plans-module',
  standalone: true,
  imports: [PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-plans-module.html',
  styleUrl: './subscription-plans-module.scss',
})
export class SubscriptionPlansModule {
  readonly plans = input<Record<string, unknown>[]>([]);
  readonly canRequest = input(false);
  readonly busy = input(false);
  readonly pendingPlanId = input<number | null>(null);
  readonly planRequested = output<Record<string, unknown>>();

  readonly currentPage = signal(1);
  readonly pageSize = 3;
  readonly visiblePlans = computed(() => {
    const all = this.plans();
    const totalPages = Math.max(1, Math.ceil(all.length / this.pageSize));
    const safePage = Math.min(this.currentPage(), totalPages);
    const start = (safePage - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  planId(plan: Record<string, unknown>): number {
    return Number(plan['plan_id'] ?? plan['id'] ?? 0);
  }

  value(plan: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = plan[key];
      if (value !== null && value !== undefined && value !== '') return String(value);
    }
    return '—';
  }
}
