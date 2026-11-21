import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { BcnBadgeComponent } from '../../../../shared/components/bcn-badge/bcn-badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { createResponsiveViewMode } from '../../../../core/workspace/responsive-view';

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
  showBcn: boolean;
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

export interface ColumnDefinition {
  key: string;
  label: string;
}

@Component({
  selector: 'app-workspace-records-module',
  standalone: true,
  imports: [StatusBadgeComponent, BcnBadgeComponent, EmptyStateComponent, PaginationComponent],
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
  readonly pageSize = input(10);
  readonly loading = input(false);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly actionRequested = output<{ action: string; record: Record<string, unknown> }>();
  readonly detailRequested = output<Record<string, unknown>>();
  readonly subscriptionReviewRequested = output<Record<string, unknown>>();
  readonly copyBcnRequested = output<string>();
  readonly mediaRemoveRequested = output<{
    record: Record<string, unknown>;
    media: Record<string, unknown>;
  }>();
  readonly proofFileSelected = output<{ event: Event; record: Record<string, unknown> }>();
  readonly proofSubmitRequested = output<Record<string, unknown>>();

  private readonly responsiveView = createResponsiveViewMode(
    inject(DestroyRef),
    'bbg_workspace_records_view',
  );
  readonly viewMode = this.responsiveView.viewMode;
  readonly setViewMode = this.responsiveView.setViewMode;
  readonly showColumnMenu = signal(false);
  readonly hiddenColumns = signal<string[]>([]);

  readonly pageSizeOptions = [5, 10, 20, 50];

  readonly availableColumns = computed<ColumnDefinition[]>(() => {
    const list = this.cards();
    const map = new Map<string, string>();
    for (const card of list) {
      for (const field of card.fields) {
        if (!map.has(field.key)) {
          map.set(field.key, field.label);
        }
      }
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  });

  readonly visibleColumns = computed<ColumnDefinition[]>(() => {
    const hidden = new Set(this.hiddenColumns());
    return this.availableColumns().filter((col) => !hidden.has(col.key));
  });

  toggleColumnMenu(): void {
    this.showColumnMenu.update((v) => !v);
  }

  isColumnVisible(key: string): boolean {
    return !this.hiddenColumns().includes(key);
  }

  toggleColumn(key: string): void {
    const hidden = this.hiddenColumns();
    if (hidden.includes(key)) {
      this.hiddenColumns.set(hidden.filter((k) => k !== key));
    } else {
      this.hiddenColumns.set([...hidden, key]);
    }
  }

  resetColumns(): void {
    this.hiddenColumns.set([]);
  }

  changePageSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const size = parseInt(select.value, 10);
    if (!isNaN(size) && size > 0) {
      this.pageSizeChange.emit(size);
    }
  }

  getFieldValue(card: WorkspaceRecordCardModel, key: string): string {
    const field = card.fields.find((f) => f.key === key);
    return field ? field.value : '—';
  }

  getPrimaryImage(card: WorkspaceRecordCardModel): string | null {
    const imageMedia = card.media.find((m) => m.type === 'IMAGE' && m.url);
    if (imageMedia?.url) return imageMedia.url;
    if (card.paymentQr?.url) return card.paymentQr.url;
    const record = card.record;
    const url =
      record['primary_image_url'] ??
      record['logo_url'] ??
      record['cover_image_url'] ??
      record['avatar_url'];
    return typeof url === 'string' && url ? url : null;
  }

  getInitials(name: string): string {
    if (!name) return '•';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
