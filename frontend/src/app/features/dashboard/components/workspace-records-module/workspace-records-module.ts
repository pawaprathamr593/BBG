import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface WorkspaceRecordAction {
  key: string;
  label: string;
  danger?: boolean;
}

export interface WorkspaceRecordMedia {
  id: string;
  type: string;
  url: string | null;
  canRemove: boolean;
}

export interface WorkspaceRecordCardModel {
  id: number;
  record: Record<string, unknown>;
  title: string;
  subtitle: string;
  status: string;
  statusClass: string;
  fields: Array<{ key: string; label: string; value: string }>;
  bcn: string | null;
  showDetail: boolean;
  showSubscriptionReview: boolean;
  paymentQr: {
    url: string;
    payeeName: string;
    upiId: string;
    version: string;
    instructions: string;
  } | null;
  media: WorkspaceRecordMedia[];
  showProofUpload: boolean;
  proofFileName: string | null;
  actions: WorkspaceRecordAction[];
}

@Component({
  selector: 'app-workspace-records-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-records-module.html',
  styleUrl: './workspace-records-module.scss',
})
export class WorkspaceRecordsModule {
  readonly heading = input.required<string>();
  readonly cards = input<WorkspaceRecordCardModel[]>([]);
  readonly totalItems = input(0);
  readonly currentPage = input(1);
  readonly pageCount = input(1);
  readonly pageSize = input(25);
  readonly loading = input(false);

  readonly pageChange = output<number>();
  readonly actionRequested = output<{ action: string; record: Record<string, unknown> }>();
  readonly detailRequested = output<Record<string, unknown>>();
  readonly subscriptionReviewRequested = output<Record<string, unknown>>();
  readonly copyBcnRequested = output<string>();
  readonly mediaRemoveRequested = output<{ record: Record<string, unknown>; media: Record<string, unknown> }>();
  readonly proofFileSelected = output<{ event: Event; record: Record<string, unknown> }>();
  readonly proofSubmitRequested = output<Record<string, unknown>>();
}
