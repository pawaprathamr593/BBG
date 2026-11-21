import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="dialog-backdrop" (click)="cancelled.emit()"></div>
      <div
        class="dialog-box"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        [attr.aria-describedby]="descId"
      >
        <h3 [id]="titleId" class="dialog-title">{{ title() }}</h3>
        <p [id]="descId" class="dialog-msg">{{ message() }}</p>
        <div class="dialog-actions">
          <button type="button" class="btn-cancel" (click)="cancelled.emit()">
            {{ cancelText() }}
          </button>
          <button
            type="button"
            class="btn-confirm"
            [class.btn-danger]="intent() === 'danger'"
            (click)="confirmed.emit()"
          >
            {{ confirmText() }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .dialog-backdrop {
        position: fixed;
        inset: 0;
        background: var(--bbg-surface-overlay);
        z-index: 1000;
        backdrop-filter: blur(2px);
      }
      .dialog-box {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 440px;
        padding: 24px;
        background: var(--bbg-surface-elevated);
        border: 1px solid var(--bbg-border-default);
        border-radius: var(--bbg-radius-lg);
        box-shadow: var(--bbg-shadow-lg);
        z-index: 1001;
      }
      .dialog-title {
        margin: 0 0 8px;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--bbg-text-primary);
      }
      .dialog-msg {
        margin: 0 0 24px;
        font-size: 0.875rem;
        color: var(--bbg-text-secondary);
        line-height: 1.5;
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .btn-cancel,
      .btn-confirm {
        padding: 8px 16px;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: var(--bbg-radius-md);
        cursor: pointer;
        font-family: inherit;
      }
      .btn-cancel {
        background: var(--bbg-surface-subtle);
        border: 1px solid var(--bbg-border-default);
        color: var(--bbg-text-primary);
      }
      .btn-confirm {
        background: var(--bbg-brand-primary);
        border: none;
        color: var(--bbg-text-inverse);
      }
      .btn-confirm.btn-danger {
        background: var(--bbg-danger);
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirm Action');
  readonly message = input('Are you sure you want to proceed?');
  readonly confirmText = input('Confirm');
  readonly cancelText = input('Cancel');
  readonly intent = input<'primary' | 'danger'>('primary');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly titleId = 'dialog-title-' + Math.random().toString(36).substring(2, 9);
  readonly descId = 'dialog-desc-' + Math.random().toString(36).substring(2, 9);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.cancelled.emit();
  }
}
