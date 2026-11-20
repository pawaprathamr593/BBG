import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="page-container"
      [class.narrow]="layout() === 'narrow'"
      [class.standard]="layout() === 'standard'"
      [class.fluid]="layout() === 'fluid'">
      <ng-content />
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .page-container {
      width: 100%;
      margin: 0 auto;
      padding: 0 16px;
    }
    @media (min-width: 640px) {
      .page-container { padding: 0 24px; }
    }
    @media (min-width: 1024px) {
      .page-container { padding: 0 32px; }
    }
    .standard { max-width: 1280px; }
    .narrow { max-width: 800px; }
    .fluid { max-width: 100%; }
  `]
})
export class PageContainerComponent {
  readonly layout = input<'standard' | 'narrow' | 'fluid'>('standard');
}
