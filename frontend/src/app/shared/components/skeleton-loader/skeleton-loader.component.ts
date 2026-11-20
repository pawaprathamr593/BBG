import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-container" [attr.aria-busy]="true">
      @for (item of items(); track $index) {
        @if (variant() === 'card') {
          <div class="skeleton-card">
            <div class="skeleton-shimmer skeleton-media"></div>
            <div class="skeleton-body">
              <div class="skeleton-shimmer skeleton-line skeleton-title"></div>
              <div class="skeleton-shimmer skeleton-line skeleton-subtitle"></div>
              <div class="skeleton-shimmer skeleton-line skeleton-detail"></div>
            </div>
          </div>
        } @else if (variant() === 'table-row') {
          <div class="skeleton-table-row">
            <div class="skeleton-shimmer skeleton-cell"></div>
            <div class="skeleton-shimmer skeleton-cell cell-wide"></div>
            <div class="skeleton-shimmer skeleton-cell"></div>
            <div class="skeleton-shimmer skeleton-cell cell-sm"></div>
          </div>
        } @else if (variant() === 'avatar') {
          <div class="skeleton-avatar-wrap">
            <div class="skeleton-shimmer skeleton-avatar"></div>
            <div class="skeleton-avatar-lines">
              <div class="skeleton-shimmer skeleton-line skeleton-title"></div>
              <div class="skeleton-shimmer skeleton-line skeleton-subtitle"></div>
            </div>
          </div>
        } @else {
          <div class="skeleton-shimmer skeleton-line"></div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .skeleton-container { display: flex; flex-direction: column; gap: 12px; width: 100%; }
    .skeleton-shimmer {
      background: linear-gradient(
        90deg,
        var(--bbg-surface-subtle) 0%,
        var(--bbg-border-default) 50%,
        var(--bbg-surface-subtle) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--bbg-radius-sm);
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .skeleton-card {
      border: 1px solid var(--bbg-border-default);
      border-radius: var(--bbg-radius-lg);
      background: var(--bbg-surface-card);
      overflow: hidden;
    }
    .skeleton-media { height: 140px; border-radius: 0; }
    .skeleton-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .skeleton-line { height: 16px; width: 100%; }
    .skeleton-title { width: 70%; height: 20px; }
    .skeleton-subtitle { width: 45%; }
    .skeleton-detail { width: 90%; }

    .skeleton-table-row {
      display: flex;
      gap: 16px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--bbg-border-default);
      align-items: center;
    }
    .skeleton-cell { height: 16px; width: 120px; }
    .cell-wide { flex: 1; }
    .cell-sm { width: 60px; }

    .skeleton-avatar-wrap { display: flex; align-items: center; gap: 12px; }
    .skeleton-avatar { width: 44px; height: 44px; border-radius: 50%; }
    .skeleton-avatar-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  `]
})
export class SkeletonLoaderComponent {
  readonly variant = input<'card' | 'table-row' | 'text' | 'avatar'>('text');
  readonly count = input(1);

  readonly items = computed(() => Array.from({ length: this.count() }));
}
