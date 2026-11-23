import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-search-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-box">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input
        type="search"
        [value]="currentValue()"
        [placeholder]="placeholder()"
        class="search-field"
        aria-label="Search"
        (input)="onInput($event)"
        (keydown.escape)="clear()"
      />
      @if (currentValue()) {
        <button type="button" class="clear-btn" aria-label="Clear search" (click)="clear()">
          ✕
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
      .search-box {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
      }
      .search-icon {
        position: absolute;
        left: 12px;
        font-size: 0.85rem;
        opacity: 0.6;
        pointer-events: none;
      }
      .search-field {
        width: 100%;
        height: 42px;
        padding: 8px 36px 8px 38px;
        font-size: 0.875rem;
        color: var(--bbg-text-primary);
        background: var(--bbg-surface-input, var(--bbg-surface-card));
        border: 1px solid var(--bbg-border-default);
        border-radius: var(--bbg-radius-md);
        transition: all 0.15s ease;
        font-family: inherit;
      }
      .search-field:focus {
        outline: none;
        border-color: var(--bbg-border-focus);
        box-shadow: var(--bbg-focus-ring);
      }
      .clear-btn {
        position: absolute;
        right: 10px;
        display: grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 50%;
        background: var(--bbg-surface-subtle);
        color: var(--bbg-text-secondary);
        font-size: 0.75rem;
        cursor: pointer;
      }
      .clear-btn:hover {
        background: var(--bbg-border-strong);
        color: var(--bbg-text-primary);
      }
    `,
  ],
})
export class SearchInputComponent {
  readonly placeholder = input('Search...');
  readonly value = input('');
  readonly debounceMs = input(300);

  readonly search = output<string>();
  readonly cleared = output<void>();

  readonly currentValue = signal('');
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
    });
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.currentValue.set(val);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.search.emit(val);
    }, this.debounceMs());
  }

  clear(): void {
    this.currentValue.set('');
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.cleared.emit();
    this.search.emit('');
  }
}
