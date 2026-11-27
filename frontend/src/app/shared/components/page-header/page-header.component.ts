import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div class="header-main">
        <ng-content select="[breadcrumbs]" />
        <h1 class="page-title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="header-actions">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        margin-bottom: 24px;
      }
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .header-main {
        flex: 1;
        min-width: 0;
      }
      .page-title {
        margin: 0;
        font-size: 1.6rem;
        font-weight: 800;
        color: var(--bbg-text-primary);
        letter-spacing: -0.02em;
      }
      .page-subtitle {
        margin: 6px 0 0;
        font-size: 0.875rem;
        color: var(--bbg-text-secondary);
        max-width: 640px;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
