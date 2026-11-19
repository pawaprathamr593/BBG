import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface ModerationHistoryItem {
  id: number;
  title: string;
  subtitle: string;
  status: string;
  statusClass: string;
  fields: Array<{ key: string; label: string; value: string }>;
}

@Component({
  selector: 'app-moderation-history-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './moderation-history-module.html',
  styleUrl: './moderation-history-module.scss',
})
export class ModerationHistoryModule {
  readonly items = input<ModerationHistoryItem[]>([]);
}
