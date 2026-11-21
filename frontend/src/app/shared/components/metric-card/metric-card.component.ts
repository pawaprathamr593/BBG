import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="metric-card">
      <div class="header">
        <span class="title">{{ title() }}</span>
        @if (icon()) {
          <span class="icon" aria-hidden="true">{{ icon() }}</span>
        }
      </div>
      <div class="value-row">
        <span class="value">{{ value() }}</span>
        @if (changeText()) {
          <span
            class="change-badge"
            [class.up]="trend() === 'up'"
            [class.down]="trend() === 'down'"
            [class.neutral]="trend() === 'neutral'"
          >
            {{ trend() === 'up' ? '↑' : trend() === 'down' ? '↓' : '•' }}
            {{ changeText() }}
          </span>
        }
      </div>
      @if (description()) {
        <p class="description">{{ description() }}</p>
      }
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .metric-card {
        padding: 20px;
        background: var(--bbg-surface-card);
        border: 1px solid var(--bbg-border-default);
        border-radius: var(--bbg-radius-lg);
        box-shadow: var(--bbg-shadow-sm);
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease;
      }
      .metric-card:hover {
        box-shadow: var(--bbg-shadow-md);
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .title {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--bbg-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .icon {
        font-size: 1.1rem;
        opacity: 0.7;
      }
      .value-row {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
      }
      .value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--bbg-text-primary);
        line-height: 1.2;
      }
      .change-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 8px;
        font-size: 0.72rem;
        font-weight: 600;
        border-radius: var(--bbg-radius-full);
      }
      .change-badge.up {
        background: var(--bbg-success-soft);
        color: var(--bbg-success);
      }
      .change-badge.down {
        background: var(--bbg-danger-soft);
        color: var(--bbg-danger);
      }
      .change-badge.neutral {
        background: var(--bbg-surface-subtle);
        color: var(--bbg-text-muted);
      }
      .description {
        margin: 8px 0 0;
        font-size: 0.75rem;
        color: var(--bbg-text-muted);
      }
    `,
  ],
})
export class MetricCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly changeText = input<string>('');
  readonly trend = input<'up' | 'down' | 'neutral'>('neutral');
  readonly icon = input<string>('');
  readonly description = input<string>('');
}
