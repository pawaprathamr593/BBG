import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Breadcrumb" class="breadcrumbs">
      <ol class="breadcrumb-list">
        @for (item of items(); track item.label; let last = $last) {
          <li class="breadcrumb-item" [attr.aria-current]="last ? 'page' : null">
            @if (!last && item.url) {
              <a [routerLink]="item.url" class="breadcrumb-link">{{ item.label }}</a>
              <span class="separator" aria-hidden="true">/</span>
            } @else {
              <span class="current-label">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    :host { display: block; margin-bottom: 8px; }
    .breadcrumb-list {
      display: flex;
      align-items: center;
      gap: 6px;
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.8125rem;
      flex-wrap: wrap;
    }
    .breadcrumb-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .breadcrumb-link {
      color: var(--bbg-text-secondary);
      text-decoration: none;
      transition: color 0.15s ease;
    }
    .breadcrumb-link:hover {
      color: var(--bbg-brand-primary);
      text-decoration: underline;
    }
    .separator {
      color: var(--bbg-text-muted);
      font-size: 0.75rem;
    }
    .current-label {
      color: var(--bbg-text-primary);
      font-weight: 600;
    }
  `]
})
export class BreadcrumbsComponent {
  readonly items = input<BreadcrumbItem[]>([]);
}
