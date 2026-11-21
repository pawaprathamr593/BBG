import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" aria-label="Pagination Navigation">
        <span class="pagination-info">
          Page {{ currentPage() }} of {{ totalPages() }} ({{ totalItems() }} items)
        </span>
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
          @for (page of visiblePages(); track page) {
            <button
              type="button"
              class="page-btn page-num"
              [class.active]="page === currentPage()"
              [attr.aria-current]="page === currentPage() ? 'page' : null"
              (click)="onPageClick(page)"
            >
              {{ page }}
            </button>
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
        gap: 16px;
        padding: 16px 0;
        flex-wrap: wrap;
      }
      .pagination-info {
        font-size: 0.8125rem;
        color: var(--bbg-text-secondary);
      }
      .pagination-buttons {
        display: flex;
        gap: 6px;
        align-items: center;
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
        color: var(--bbg-text-primary);
        background: var(--bbg-surface-card);
        border: 1px solid var(--bbg-border-default);
        border-radius: var(--bbg-radius-md);
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
      }
      .page-btn:hover:not(:disabled) {
        border-color: var(--bbg-brand-primary);
        background: var(--bbg-surface-subtle);
      }
      .page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .page-num.active {
        background: var(--bbg-brand-primary);
        color: var(--bbg-text-inverse);
        border-color: var(--bbg-brand-primary);
      }
    `,
  ],
})
export class PaginationComponent {
  readonly currentPage = input(1);
  readonly totalItems = input(0);
  readonly pageSize = input(10);
  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.ceil(this.totalItems() / (this.pageSize() || 10)));

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  onPageClick(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}
