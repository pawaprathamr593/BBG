import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-infinite-scroll-sentinel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #sentinel class="infinite-sentinel" aria-live="polite">
      @if (loadingMore()) {
        <div class="sentinel-status" role="status">
          <span class="spinner" aria-hidden="true"></span>
          <span>Loading more {{ itemLabel() }}…</span>
        </div>
      } @else if (hasMore()) {
        <div class="sentinel-actions">
          @if (totalItems() > 0) {
            <span class="sentinel-count">
              Showing {{ loadedCount() }} of {{ totalItems() }} {{ itemLabel() }}
            </span>
          }
          <button type="button" class="load-more-btn" (click)="triggerLoadMore()">
            Load more {{ itemLabel() }}
          </button>
        </div>
      } @else if (loadedCount() > 0) {
        <p class="sentinel-end">
          Showing all {{ loadedCount() }}
          {{ totalItems() > loadedCount() ? 'of ' + totalItems() + ' ' : '' }}{{ itemLabel() }}
        </p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .infinite-sentinel {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 24px 0 8px;
        min-height: 56px;
      }
      .sentinel-status {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--bbg-text-secondary, var(--text-secondary));
      }
      .spinner {
        width: 18px;
        height: 18px;
        border: 2.5px solid var(--bbg-border-default, var(--border));
        border-top-color: var(--store-accent, var(--bbg-brand-primary, #f5d928));
        border-radius: 50%;
        animation: sentinel-spin 0.75s linear infinite;
      }
      .sentinel-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      .sentinel-count,
      .sentinel-end {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--bbg-text-secondary, var(--text-secondary));
      }
      .load-more-btn {
        height: 36px;
        padding: 0 18px;
        font-size: 0.8125rem;
        font-weight: 700;
        font-family: inherit;
        color: var(--bbg-text-primary, var(--text-primary));
        background: var(--bbg-surface-card, var(--surface-card));
        border: 1px solid var(--bbg-border-default, var(--border));
        border-radius: var(--bbg-radius-full, 9999px);
        cursor: pointer;
        transition: all 0.16s ease;
      }
      .load-more-btn:hover {
        border-color: var(--store-accent, var(--bbg-brand-primary, #f5d928));
        background: var(--bbg-surface-subtle, var(--surface-subtle));
      }
      .load-more-btn:focus-visible {
        outline: none;
        border-color: var(--bbg-border-focus, #f5d927);
        box-shadow: var(--bbg-focus-ring, 0 0 0 3px rgba(245, 217, 40, 0.35));
      }
      @keyframes sentinel-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class InfiniteScrollSentinelComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly sentinelRef = viewChild<ElementRef<HTMLElement>>('sentinel');

  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly loadedCount = input(0);
  readonly totalItems = input(0);
  readonly itemLabel = input('items');
  readonly loadMore = output<void>();

  private observer: IntersectionObserver | null = null;
  private isIntersecting = false;

  constructor() {
    // Re-trigger if the sentinel remains in view after a batch finishes loading
    effect(() => {
      const hasMore = this.hasMore();
      const loadingMore = this.loadingMore();
      if (hasMore && !loadingMore && this.isIntersecting) {
        queueMicrotask(() => {
          if (this.hasMore() && !this.loadingMore() && this.isIntersecting) {
            this.loadMore.emit();
          }
        });
      }
    });
  }

  ngAfterViewInit(): void {
    const el = this.sentinelRef()?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.isIntersecting = Boolean(entry?.isIntersecting);
        if (this.isIntersecting && this.hasMore() && !this.loadingMore()) {
          this.loadMore.emit();
        }
      },
      { rootMargin: '220px 0px' },
    );

    this.observer.observe(el);
    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
    });
  }

  triggerLoadMore(): void {
    if (this.hasMore() && !this.loadingMore()) {
      this.loadMore.emit();
    }
  }
}
