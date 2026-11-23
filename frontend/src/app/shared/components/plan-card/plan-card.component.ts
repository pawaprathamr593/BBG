import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-plan-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="plan-card"
      [class.recommended]="isRecommended()"
      [class.selected]="isSelected()"
      (click)="selected.emit()"
    >
      @if (badge() || isRecommended()) {
        <div class="plan-badge">
          {{ badge() || 'Recommended' }}
        </div>
      }
      <div class="plan-header">
        <h3 class="plan-name">{{ name() }}</h3>
        <div class="price-wrap">
          <span class="currency">₹</span>
          <span class="price">{{ price() }}</span>
          <span class="period">/ {{ period() }}</span>
        </div>
      </div>
      <ul class="features-list">
        @for (feature of features(); track feature) {
          <li class="feature-item">
            <span class="check-icon" aria-hidden="true">✓</span>
            <span>{{ feature }}</span>
          </li>
        }
      </ul>
      <button type="button" class="select-btn" [class.btn-active]="isSelected()">
        {{ isSelected() ? 'Selected Plan' : 'Select Plan' }}
      </button>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .plan-card {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 24px;
        background: var(--bbg-surface-card);
        border: 2px solid var(--bbg-border-default);
        border-radius: var(--bbg-radius-lg);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .plan-card:hover {
        border-color: var(--bbg-brand-primary);
        transform: translateY(-2px);
        box-shadow: var(--bbg-shadow-md);
      }
      .plan-card.recommended {
        border-color: var(--bbg-brand-primary);
        box-shadow: 0 4px 20px rgba(23, 77, 53, 0.12);
      }
      .plan-card.selected {
        border-color: var(--bbg-brand-primary);
        background: var(--bbg-brand-primary-soft);
      }
      .plan-badge {
        position: absolute;
        top: -12px;
        right: 20px;
        padding: 4px 12px;
        background: var(--bbg-brand-accent);
        color: #000000;
        font-size: 0.72rem;
        font-weight: 700;
        border-radius: var(--bbg-radius-full);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .plan-header {
        margin-bottom: 20px;
      }
      .plan-name {
        margin: 0 0 10px;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--bbg-text-primary);
      }
      .price-wrap {
        display: flex;
        align-items: baseline;
        gap: 2px;
      }
      .currency {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--bbg-text-primary);
      }
      .price {
        font-size: 2rem;
        font-weight: 800;
        color: var(--bbg-text-primary);
        line-height: 1;
      }
      .period {
        margin-left: 4px;
        font-size: 0.85rem;
        color: var(--bbg-text-muted);
      }
      .features-list {
        list-style: none;
        padding: 0;
        margin: 0 0 24px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .feature-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 0.84rem;
        color: var(--bbg-text-secondary);
        line-height: 1.4;
      }
      .check-icon {
        color: var(--bbg-brand-primary);
        font-weight: 800;
      }
      .select-btn {
        width: 100%;
        padding: 10px;
        font-size: 0.875rem;
        font-weight: 600;
        border: 1px solid var(--bbg-border-strong);
        border-radius: var(--bbg-radius-md);
        background: var(--bbg-surface-card);
        color: var(--bbg-text-primary);
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s ease;
      }
      .select-btn:hover,
      .btn-active {
        background: var(--bbg-brand-primary);
        color: var(--bbg-text-inverse);
        border-color: var(--bbg-brand-primary);
      }
    `,
  ],
})
export class PlanCardComponent {
  readonly name = input.required<string>();
  readonly price = input.required<string | number>();
  readonly period = input('month');
  readonly features = input<string[]>([]);
  readonly isRecommended = input(false);
  readonly isSelected = input(false);
  readonly badge = input('');

  readonly selected = output<void>();
}
