import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bbg-form-group" [class.has-error]="!!error()">
      @if (label()) {
        <label [for]="id()" class="bbg-label">
          {{ label() }}
          @if (required()) {
            <span class="required-mark" aria-hidden="true">*</span>
          }
        </label>
      }
      <textarea
        [id]="id()"
        [name]="name() || id()"
        [value]="value()"
        [rows]="rows()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [required]="required()"
        [attr.maxlength]="maxLength() || null"
        [attr.aria-invalid]="!!error()"
        [attr.aria-describedby]="error() ? id() + '-error' : null"
        class="bbg-textarea"
        (input)="onInput($event)"
      ></textarea>
      <div class="footer-row">
        @if (error()) {
          <p [id]="id() + '-error'" class="bbg-error-msg" role="alert">{{ error() }}</p>
        } @else if (hint()) {
          <p class="bbg-hint-msg">{{ hint() }}</p>
        }
        @if (maxLength()) {
          <span class="char-count">{{ value().length }} / {{ maxLength() }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .bbg-form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }
      .bbg-label {
        font-size: 0.84rem;
        font-weight: 600;
        color: var(--bbg-text-primary);
      }
      .required-mark {
        color: var(--bbg-danger);
        margin-left: 2px;
      }
      .bbg-textarea {
        width: 100%;
        padding: 10px 12px;
        font-size: 0.875rem;
        color: var(--bbg-text-primary);
        background: var(--bbg-surface-card);
        border: 1px solid var(--bbg-border-default);
        border-radius: var(--bbg-radius-md);
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
        font-family: inherit;
        resize: vertical;
        min-height: 80px;
      }
      .bbg-textarea:focus {
        outline: none;
        border-color: var(--bbg-border-focus);
        box-shadow: var(--bbg-focus-ring);
      }
      .bbg-textarea:disabled {
        background: var(--bbg-surface-subtle);
        color: var(--bbg-text-muted);
        cursor: not-allowed;
      }
      .has-error .bbg-textarea {
        border-color: var(--bbg-danger);
      }
      .footer-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .bbg-error-msg {
        margin: 0;
        font-size: 0.75rem;
        color: var(--bbg-danger);
        font-weight: 500;
      }
      .bbg-hint-msg {
        margin: 0;
        font-size: 0.75rem;
        color: var(--bbg-text-muted);
      }
      .char-count {
        font-size: 0.72rem;
        color: var(--bbg-text-muted);
        margin-left: auto;
      }
    `,
  ],
})
export class TextareaComponent {
  readonly id = input.required<string>();
  readonly label = input('');
  readonly name = input('');
  readonly value = input('');
  readonly rows = input(3);
  readonly placeholder = input('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly error = input('');
  readonly hint = input('');
  readonly maxLength = input<number | undefined>(undefined);

  readonly valueChange = output<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.valueChange.emit(target.value);
  }
}
