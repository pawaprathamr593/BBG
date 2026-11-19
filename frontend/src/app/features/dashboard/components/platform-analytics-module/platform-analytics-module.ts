import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-platform-analytics-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './platform-analytics-module.html',
  styleUrl: './platform-analytics-module.scss',
})
export class PlatformAnalyticsModule {
  readonly points = input<Record<string, unknown>[]>([]);

  fields(point: Record<string, unknown>): Array<{ key: string; label: string; value: string }> {
    return Object.entries(point)
      .filter(([, value]) => value === null || typeof value !== 'object')
      .map(([key, value]) => ({ key, label: this.humanize(key), value: this.formatValue(value) }));
  }

  humanize(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'number') return new Intl.NumberFormat().format(value);
    return String(value);
  }

  pointId(point: Record<string, unknown>, index: number): string {
    return String(point['date'] ?? point['period'] ?? point['created_on'] ?? index);
  }
}
