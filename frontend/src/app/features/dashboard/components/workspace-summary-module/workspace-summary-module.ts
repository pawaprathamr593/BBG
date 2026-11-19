import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface WorkspaceSummaryItem {
  key: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-workspace-summary-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-summary-module.html',
  styleUrl: './workspace-summary-module.scss',
})
export class WorkspaceSummaryModule {
  readonly entries = input<WorkspaceSummaryItem[]>([]);
}
