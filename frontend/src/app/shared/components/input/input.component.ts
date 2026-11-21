import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-input',
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
      <div class="input-wrapper">
        <input
          [id]="id()"
          [name]="name() || id()"
          [type]="type()"
          [value]="value()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [required]="required()"
          [autocomplete]="autocomplete()"
          [attr.aria-invalid]="!!error()"
          [attr.aria-describedby]="error() ? id() + '-error' : hint() ? id() + '-hint' : null"
          class="bbg-input"
          (input)="onInput($event)"
          (blur)="blurEvent.emit($event)"
        />
      </div>
      @if (error()) {
        <p [id]="id() + '-error'" class="bbg-error-msg" role="alert">{{ error() }}</p>
      } @else if (hint()) {
        <p [id]="id() + '-hint'" class="bbg-hint-msg">{{ hint() }}</p>
      }
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
      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .bbg-input {
        width: 100%;
        height: 42px;
        padding: 8px 12px;
        font-size: 0.875rem;
        color: var(--bbg-text-primary);
        background: var(--bbg-surface-input);
        border: 1px solid var(--bbg-border-default);
        border-radius: var(--bbg-radius-md);
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
        font-family: inherit;
      }
      .bbg-input:focus {
        outline: none;
        border-color: var(--bbg-border-focus);
        box-shadow: var(--bbg-focus-ring);
      }
      .bbg-input:disabled {
        background: var(--bbg-surface-subtle);
        color: var(--bbg-text-muted);
        cursor: not-allowed;
      }
      .has-error .bbg-input {
        border-color: var(--bbg-danger);
      }
      .has-error .bbg-input:focus {
        box-shadow: 0 0 0 3px var(--bbg-danger-soft);
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
    `,
  ],
})
export class InputComponent {
  readonly id = input.required<string>();
  readonly label = input('');
  readonly name = input('');
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'tel' | 'url'>('text');
  readonly placeholder = input('');
  readonly value = input('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly error = input('');
  readonly hint = input('');
  readonly autocomplete = input('off');

  readonly valueChange = output<string>();
  readonly blurEvent = output<FocusEvent>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
