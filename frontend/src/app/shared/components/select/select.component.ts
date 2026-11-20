import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SelectOption {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bbg-form-group" [class.has-error]="!!error()">
      @if (label()) {
        <label [for]="id()" class="bbg-label">
          {{ label() }}
          @if (required()) { <span class="required-mark" aria-hidden="true">*</span> }
        </label>
      }
      <div class="select-wrapper">
        <select
          [id]="id()"
          [name]="name() || id()"
          [value]="value()"
          [disabled]="disabled()"
          [required]="required()"
          [attr.aria-invalid]="!!error()"
          [attr.aria-describedby]="error() ? id() + '-error' : null"
          class="bbg-select"
          (change)="onChange($event)">
          @if (placeholder()) {
            <option value="" disabled [selected]="!value()">{{ placeholder() }}</option>
          }
          @for (option of options(); track option.value) {
            <option [value]="option.value" [selected]="option.value === value()">
              {{ option.label }}
            </option>
          }
        </select>
        <span class="select-arrow" aria-hidden="true">▾</span>
      </div>
      @if (error()) {
        <p [id]="id() + '-error'" class="bbg-error-msg" role="alert">{{ error() }}</p>
      } @else if (hint()) {
        <p class="bbg-hint-msg">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
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
    .required-mark { color: var(--bbg-danger); margin-left: 2px; }
    .select-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .bbg-select {
      width: 100%;
      height: 42px;
      padding: 8px 36px 8px 12px;
      font-size: 0.875rem;
      color: var(--bbg-text-primary);
      background: var(--bbg-surface-card);
      border: 1px solid var(--bbg-border-default);
      border-radius: var(--bbg-radius-md);
      appearance: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      font-family: inherit;
      cursor: pointer;
    }
    .bbg-select:focus {
      outline: none;
      border-color: var(--bbg-border-focus);
      box-shadow: var(--bbg-focus-ring);
    }
    .bbg-select:disabled {
      background: var(--bbg-surface-subtle);
      color: var(--bbg-text-muted);
      cursor: not-allowed;
    }
    .select-arrow {
      position: absolute;
      right: 12px;
      pointer-events: none;
      color: var(--bbg-text-secondary);
      font-size: 0.9rem;
    }
    .has-error .bbg-select { border-color: var(--bbg-danger); }
    .bbg-error-msg { margin: 0; font-size: 0.75rem; color: var(--bbg-danger); font-weight: 500; }
    .bbg-hint-msg { margin: 0; font-size: 0.75rem; color: var(--bbg-text-muted); }
  `]
})
export class SelectComponent {
  readonly id = input.required<string>();
  readonly label = input('');
  readonly name = input('');
  readonly value = input<string | number>('');
  readonly options = input<SelectOption[]>([]);
  readonly placeholder = input('Select an option');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly error = input('');
  readonly hint = input('');

  readonly valueChange = output<string>();

  onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.valueChange.emit(target.value);
  }
}
