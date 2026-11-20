import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      class="bbg-btn"
      [class.btn-primary]="variant() === 'primary'"
      [class.btn-secondary]="variant() === 'secondary'"
      [class.btn-accent]="variant() === 'accent'"
      [class.btn-outline]="variant() === 'outline'"
      [class.btn-ghost]="variant() === 'ghost'"
      [class.btn-danger]="variant() === 'danger'"
      [class.btn-sm]="size() === 'sm'"
      [class.btn-md]="size() === 'md'"
      [class.btn-lg]="size() === 'lg'"
      [class.btn-full]="fullWidth()"
      [disabled]="disabled() || loading()"
      [attr.aria-label]="ariaLabel() || null"
      (click)="onClick($event)">
      @if (loading()) {
        <span class="btn-spinner" aria-hidden="true"></span>
      }
      <span class="btn-content" [class.is-loading]="loading()">
        <ng-content />
      </span>
    </button>
  `,
  styles: [`
    :host { display: inline-block; }
    :host([fullWidth="true"]), :host(.full-width) { display: block; width: 100%; }
    .bbg-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-weight: 600;
      border-radius: var(--bbg-radius-md);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      text-decoration: none;
      white-space: nowrap;
      user-select: none;
      font-family: inherit;
    }
    .bbg-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }
    .btn-full { width: 100%; }

    /* Sizes */
    .btn-sm { padding: 6px 12px; font-size: 0.8125rem; min-height: 32px; }
    .btn-md { padding: 9px 16px; font-size: 0.875rem; min-height: 40px; }
    .btn-lg { padding: 12px 24px; font-size: 1rem; min-height: 48px; }

    /* Variants */
    .btn-primary {
      background: var(--bbg-brand-primary);
      color: var(--bbg-text-inverse);
      border-color: var(--bbg-brand-primary);
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--bbg-brand-primary-hover);
      border-color: var(--bbg-brand-primary-hover);
    }

    .btn-accent {
      background: var(--bbg-brand-accent);
      color: #171d19;
      border-color: var(--bbg-brand-accent);
    }
    .btn-accent:hover:not(:disabled) {
      background: var(--bbg-brand-accent-hover);
      border-color: var(--bbg-brand-accent-hover);
    }

    .btn-secondary {
      background: var(--bbg-surface-subtle);
      color: var(--bbg-text-primary);
      border-color: var(--bbg-border-default);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--bbg-border-subtle);
      border-color: var(--bbg-border-strong);
    }

    .btn-outline {
      background: transparent;
      color: var(--bbg-brand-primary);
      border-color: var(--bbg-brand-primary);
    }
    .btn-outline:hover:not(:disabled) {
      background: var(--bbg-brand-primary-soft);
    }

    .btn-ghost {
      background: transparent;
      color: var(--bbg-text-secondary);
      border-color: transparent;
    }
    .btn-ghost:hover:not(:disabled) {
      background: var(--bbg-surface-subtle);
      color: var(--bbg-text-primary);
    }

    .btn-danger {
      background: var(--bbg-danger);
      color: #ffffff;
      border-color: var(--bbg-danger);
    }
    .btn-danger:hover:not(:disabled) {
      background: #991b1b;
    }

    /* Spinner */
    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: btn-spin 0.6s linear infinite;
    }
    .is-loading { opacity: 0.8; }
    @keyframes btn-spin { to { transform: rotate(360deg); } }
  `]
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly ariaLabel = input('');
  readonly clicked = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
