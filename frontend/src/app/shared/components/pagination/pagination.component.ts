import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

type PageToken = number | 'ellipsis-start' | 'ellipsis-end';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shouldRender()) {
      <nav class="pagination" aria-label="Pagination Navigation">
        <div class="pagination-summary">
          <span class="pagination-info" aria-live="polite">
            Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ totalItems() }} {{ itemLabel() }}
            @if (totalPages() > 1) {
              <span class="page-count"> · Page {{ currentPage() }} of {{ totalPages() }}</span>
            }
          </span>
          @if (showPageSize() && totalItems() > 0) {
            <label class="page-size-control">
              <span>Per page</span>
              <select
                aria-label="Items per page"
                [value]="pageSize()"
                (change)="onPageSizeSelect($event)"
              >
                @for (option of pageSizeOptions(); track option) {
                  <option [value]="option" [selected]="option === pageSize()">{{ option }}</option>
                }
              </select>
            </label>
          }
        </div>

        @if (totalPages() > 1) {
          <div class="pagination-buttons">
            <button
              type="button"
              class="page-btn"
              [disabled]="currentPage() <= 1"
              (click)="onPageClick(currentPage() - 1)"
              aria-label="Previous page"
            >
              ‹ Prev
            </button>
            @for (token of visiblePageTokens(); track token) {
              @if (token === 'ellipsis-start' || token === 'ellipsis-end') {
                <span class="page-ellipsis" aria-hidden="true">…</span>
              } @else {
                <button
                  type="button"
                  class="page-btn page-num"
                  [class.active]="token === currentPage()"
                  [attr.aria-current]="token === currentPage() ? 'page' : null"
                  [attr.aria-label]="'Page ' + token"
                  (click)="onPageClick(token)"
                >
                  {{ token }}
                </button>
              }
            }
            <button
              type="button"
              class="page-btn"
              [disabled]="currentPage() >= totalPages()"
              (click)="onPageClick(currentPage() + 1)"
              aria-label="Next page"
            >
              Next ›
            </button>
          </div>
        }
      </nav>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px 18px;
        padding: 16px 0;
        flex-wrap: wrap;
      }
      .pagination-summary {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }
      .pagination-info {
        font-size: 0.8125rem;
        color: var(--bbg-text-secondary, var(--text-secondary));
      }
      .page-size-control {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8125rem;
        color: var(--bbg-text-secondary, var(--text-secondary));
      }
      .page-size-control select {
        height: 32px;
        padding: 0 8px;
        font-size: 0.8125rem;
        font-weight: 600;
        font-family: inherit;
        color: var(--bbg-text-primary, var(--text-primary));
        background: var(--bbg-surface-card, var(--surface-card));
        border: 1px solid var(--bbg-border-default, var(--border));
        border-radius: var(--bbg-radius-md, 8px);
        cursor: pointer;
      }
      .page-size-control select:focus-visible {
        outline: none;
        border-color: var(--bbg-border-focus, #f5d927);
        box-shadow: var(--bbg-focus-ring, 0 0 0 3px rgba(245, 217, 40, 0.35));
      }
      .pagination-buttons {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }
      .page-ellipsis {
        padding: 0 4px;
        font-size: 0.85rem;
        color: var(--bbg-text-muted, var(--text-muted));
        user-select: none;
      }
      .page-btn {
        min-width: 34px;
        height: 34px;
        padding: 0 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--bbg-text-primary, var(--text-primary));
        background: var(--bbg-surface-card, var(--surface-card));
        border: 1px solid var(--bbg-border-default, var(--border));
        border-radius: var(--bbg-radius-md, 8px);
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
      }
      .page-btn:hover:not(:disabled) {
        border-color: var(--store-accent, var(--bbg-brand-primary, #f5d928));
        background: var(--bbg-surface-subtle, var(--surface-subtle));
      }
      .page-btn:focus-visible {
        outline: none;
        border-color: var(--bbg-border-focus, #f5d927);
        box-shadow: var(--bbg-focus-ring, 0 0 0 3px rgba(245, 217, 40, 0.35));
      }
      .page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .page-num.active {
        background: var(--store-accent, var(--bbg-brand-primary, #f5d928));
        color: var(--bbg-text-inverse, #000000);
        border-color: var(--store-accent, var(--bbg-brand-primary, #f5d928));
        font-weight: 800;
      }
      @media (max-width: 640px) {
        .pagination {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class PaginationComponent {
  readonly currentPage = input(1);
  readonly totalItems = input(0);
  readonly pageSize = input(10);
  readonly showPageSize = input(false);
  readonly showWhenSinglePage = input(false);
  readonly pageSizeOptions = input<number[]>([3, 6, 12, 24]);
  readonly itemLabel = input('items');
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / Math.max(1, this.pageSize() || 10))),
  );

  readonly shouldRender = computed(
    () =>
      this.totalPages() > 1 ||
      (this.showWhenSinglePage() && this.showPageSize() && this.totalItems() > 0),
  );

  readonly rangeStart = computed(() =>
    this.totalItems() <= 0 ? 0 : (this.currentPage() - 1) * Math.max(1, this.pageSize()) + 1,
  );

  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * Math.max(1, this.pageSize()), this.totalItems()),
  );

  readonly visiblePageTokens = computed<PageToken[]>(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, idx) => idx + 1);
    }

    const tokens: PageToken[] = [1];
    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);

    if (start > 2) {
      tokens.push('ellipsis-start');
    }
    for (let i = start; i <= end; i++) {
      tokens.push(i);
    }
    if (end < total - 1) {
      tokens.push('ellipsis-end');
    }
    tokens.push(total);
    return tokens;
  });

  onPageClick(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeSelect(event: Event): void {
    const nextSize = Number((event.target as HTMLSelectElement).value);
    if (Number.isFinite(nextSize) && nextSize > 0 && nextSize !== this.pageSize()) {
      this.pageSizeChange.emit(nextSize);
    }
  }
}
