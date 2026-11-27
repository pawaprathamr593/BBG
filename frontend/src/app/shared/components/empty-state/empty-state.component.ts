import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <div class="icon-wrap" aria-hidden="true">
        {{ icon() || '📦' }}
      </div>
      <h3 class="title">{{ title() }}</h3>
      @if (description()) {
        <p class="description">{{ description() }}</p>
      }
      @if (actionText()) {
        <button type="button" class="action-btn" (click)="actionClicked.emit()">
          {{ actionText() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 48px 24px;
        border-radius: var(--bbg-radius-xl, 16px);
        background: var(--bbg-glass-bg-subtle, var(--bbg-surface-subtle));
        backdrop-filter: var(--bbg-glass-blur-sm);
        -webkit-backdrop-filter: var(--bbg-glass-blur-sm);
        border: 1px solid var(--bbg-glass-border, var(--bbg-border-default));
        box-shadow: var(--bbg-glass-shadow), var(--bbg-glass-highlight);
      }
      .icon-wrap {
        font-size: 2.5rem;
        margin-bottom: 16px;
        line-height: 1;
      }
      .title {
        margin: 0 0 8px;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--bbg-text-primary);
      }
      .description {
        margin: 0 0 20px;
        max-width: 420px;
        font-size: 0.875rem;
        color: var(--bbg-text-secondary);
        line-height: 1.5;
      }
      .action-btn {
        padding: 9px 18px;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--bbg-text-inverse);
        background: var(--bbg-brand-primary);
        border: none;
        border-radius: var(--bbg-radius-md);
        cursor: pointer;
        transition: background 0.15s ease;
        font-family: inherit;
      }
      .action-btn:hover {
        background: var(--bbg-brand-primary-hover);
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly icon = input('');
  readonly actionText = input('');
  readonly actionClicked = output<void>();
}
