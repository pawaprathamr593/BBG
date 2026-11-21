import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-bcn-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="bcn-badge" [title]="'Bharat Business Identification: ' + bcn()">
      <span class="bcn-icon" aria-hidden="true">✓</span>
      <span class="bcn-code">{{ bcn() }}</span>
      @if (verified()) {
        <span class="verified-tag">Verified</span>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        vertical-align: middle;
      }
      .bcn-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: var(--bbg-radius-xs);
        background: var(--bbg-brand-primary-soft);
        border: 1px solid rgba(23, 77, 53, 0.2);
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--bbg-brand-primary);
        letter-spacing: 0.02em;
      }
      .bcn-icon {
        font-size: 0.75rem;
        color: var(--bbg-brand-primary);
      }
      .verified-tag {
        font-size: 0.65rem;
        text-transform: uppercase;
        padding: 1px 4px;
        border-radius: 2px;
        background: var(--bbg-brand-primary);
        color: var(--bbg-text-inverse);
      }
    `,
  ],
})
export class BcnBadgeComponent {
  readonly bcn = input.required<string>();
  readonly verified = input(true);
}
