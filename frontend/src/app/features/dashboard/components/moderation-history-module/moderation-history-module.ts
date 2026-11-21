import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

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
  imports: [StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './moderation-history-module.html',
  styleUrl: './moderation-history-module.scss',
})
export class ModerationHistoryModule {
  readonly items = input<ModerationHistoryItem[]>([]);
}
