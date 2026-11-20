import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusBadgeType =
  | 'pending'
  | 'active'
  | 'approved'
  | 'rejected'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'draft'
  | 'info';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="bbg-badge"
      [class]="'badge-' + normalizedStatus()"
      [class.badge-sm]="size() === 'sm'"
      [class.badge-md]="size() === 'md'">
      <span class="badge-dot" aria-hidden="true"></span>
      <span class="badge-text">{{ displayLabel() }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }
    .bbg-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      border-radius: var(--bbg-radius-full);
      white-space: nowrap;
      text-transform: capitalize;
      user-select: none;
    }
    .badge-sm { padding: 2px 8px; font-size: 0.72rem; }
    .badge-md { padding: 4px 10px; font-size: 0.78rem; }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .badge-active, .badge-approved, .badge-delivered {
      background: var(--bbg-success-soft);
      color: var(--bbg-success);
    }
    .badge-pending {
      background: var(--bbg-warning-soft);
      color: var(--bbg-warning);
    }
    .badge-rejected, .badge-cancelled {
      background: var(--bbg-danger-soft);
      color: var(--bbg-danger);
    }
    .badge-shipped, .badge-info {
      background: var(--bbg-info-soft);
      color: var(--bbg-info);
    }
    .badge-draft {
      background: var(--bbg-surface-subtle);
      color: var(--bbg-text-secondary);
    }
  `]
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input<string>('');
  readonly size = input<'sm' | 'md'>('md');

  readonly normalizedStatus = computed<StatusBadgeType>(() => {
    const s = this.status().toLowerCase();
    if (['active', 'approved', 'delivered'].includes(s)) return s as StatusBadgeType;
    if (['pending', 'processing', 'in_review'].includes(s)) return 'pending';
    if (['rejected', 'cancelled', 'failed'].includes(s)) return 'rejected';
    if (['shipped', 'dispatched'].includes(s)) return 'shipped';
    if (['draft', 'inactive'].includes(s)) return 'draft';
    return 'info';
  });

  readonly displayLabel = computed<string>(() => {
    if (this.label()) return this.label();
    return this.status().replace(/_/g, ' ');
  });
}
