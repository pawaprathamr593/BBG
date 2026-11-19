import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-subscription-plans-module',
  standalone: true,
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
