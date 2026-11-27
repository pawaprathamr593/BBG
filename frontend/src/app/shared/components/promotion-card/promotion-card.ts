import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthDialogService } from '../../../core/auth/auth-dialog.service';
import { EngagementApiService } from '../../../core/engagement/engagement-api.service';
import type { CardMediaModel, PromotionCardModel } from '../../models/marketplace-card.models';
import { PromotionEngagementComponent } from '../promotion-engagement/promotion-engagement.component';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

const SAVED_PROMOTIONS_STORAGE_KEY = 'bbg_saved_promotions_v1';

@Component({
  selector: 'app-promotion-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    PromotionEngagementComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './promotion-card.html',
  styleUrl: './promotion-card.scss',
})
export class PromotionCard {
  private readonly router = inject(Router);
  private readonly engagementApi = inject(EngagementApiService);
  private readonly authDialog = inject(AuthDialogService);

  readonly promotion = input.required<PromotionCardModel>();
  readonly label = input('BBG PROMOTION');
  readonly selected = output<PromotionCardModel>();

  protected readonly logoError = signal(false);
  protected readonly imageLoading = signal(true);
  protected readonly failedMediaIds = signal<ReadonlySet<number>>(new Set());
  protected readonly isSaved = signal(false);
  protected readonly saveFeedback = signal<string | null>(null);

  // Header Report Action State (backed by EngagementApiService.reportContent)
  protected readonly reportOpen = signal(false);
  protected readonly reportReason = signal('MISLEADING');
  protected readonly reportDetails = signal('');
  protected readonly submittingReport = signal(false);
  protected readonly reportFeedback = signal<string | null>(null);
  protected readonly reportError = signal<string | null>(null);

  protected readonly reportReasons: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'MISLEADING', label: 'Misleading or inaccurate offer' },
    { value: 'SPAM', label: 'Spam or repetitive promotion' },
    { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
    { value: 'OTHER', label: 'Other concern' },
  ];

  protected readonly hasValidLogo = computed<boolean>(() => {
    return !this.logoError() && !!this.promotion().logo_path;
  });

  protected readonly isVerified = computed<boolean>(() => {
    return this.promotion().verified !== false;
  });

  protected readonly businessLocation = computed<string | null>(() => {
    const city = (this.promotion().city || '').trim();
    const state = (this.promotion().state || '').trim();
    if (city && state) return `${city}, ${state}`;
    return city || state || null;
  });

  /**
   * Authoritative Primary Image selection:
   * 1. Media item of type 'IMAGE' with explicit is_primary === 1 or display_order === 0
   * 2. Fall back to first available media item of type 'IMAGE'
   * 3. null when no image exists or loading failed
   */
  protected readonly primaryImage = computed<CardMediaModel | null>(() => {
    const media = this.promotion().media ?? [];
    const images = media.filter(
      (m) => m.media_type === 'IMAGE' && !!m.url && !this.failedMediaIds().has(m.id),
    );
    if (!images.length) return null;
    const explicit = images.find(
      (m) => (m as any).is_primary === 1 || (m as any).display_order === 0,
    );
    return explicit ?? images[0];
  });

  protected readonly businessMonogram = computed<string>(() => {
    const name = (this.promotion().business_name || '').trim();
    if (!name) return 'B';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  protected readonly isExpired = computed<boolean>(() => {
    const validUntil = this.promotion().valid_until;
    if (!validUntil) return false;
    const expiry = new Date(validUntil).getTime();
    return !Number.isNaN(expiry) && expiry < Date.now();
  });

  constructor() {
    effect(() => {
      const id = this.promotion().id;
      this.logoError.set(false);
      this.imageLoading.set(true);
      this.isSaved.set(this.readSavedIds().has(id));
    });
  }

  protected onLogoError(): void {
    this.logoError.set(true);
  }

  protected onImageLoad(): void {
    this.imageLoading.set(false);
  }

  protected onMediaError(mediaId: number): void {
    this.imageLoading.set(false);
    this.failedMediaIds.update((prev) => {
      const next = new Set(prev);
      next.add(mediaId);
      return next;
    });
  }

  protected openDetail(event?: Event): void {
    if (event) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'button, a, input, textarea, select, .report-post-panel, app-promotion-engagement',
        ) &&
        !target.closest('.card-media-frame, .post-title, .btn-view-promotion')
      ) {
        return;
      }
    }
    this.selected.emit(this.promotion());
    void this.router.navigate(['/promotions', this.promotion().id]);
  }

  protected onCommentClick(event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/promotions', this.promotion().id], { fragment: 'comments' });
  }

  protected onSelectKeydown(event: Event): void {
    event.preventDefault();
    this.openDetail(event);
  }

  protected toggleSave(event: Event): void {
    event.stopPropagation();
    const id = this.promotion().id;
    const savedIds = this.readSavedIds();
    const nextSaved = !this.isSaved();
    if (nextSaved) {
      savedIds.add(id);
    } else {
      savedIds.delete(id);
    }
    this.writeSavedIds(savedIds);
    this.isSaved.set(nextSaved);
    this.saveFeedback.set(nextSaved ? 'Promotion saved to your bookmarks.' : 'Removed from saved.');
    setTimeout(() => this.saveFeedback.set(null), 2200);
  }

  protected toggleReportPanel(event: Event): void {
    event.stopPropagation();
    if (this.reportOpen()) {
      this.closeReportPanel();
      return;
    }

    const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void this.authDialog.requireAuthentication(
      'Sign in to report this promotional post',
      anchor,
      () => {
        this.reportError.set(null);
        this.reportFeedback.set(null);
        this.reportOpen.set(true);
      },
    );
  }

  protected closeReportPanel(): void {
    this.reportOpen.set(false);
    this.reportError.set(null);
    this.reportDetails.set('');
  }

  protected async submitReport(): Promise<void> {
    if (this.submittingReport()) return;
    this.submittingReport.set(true);
    this.reportError.set(null);

    try {
      const res = await firstValueFrom(
        this.engagementApi.reportContent({
          content_type: 'POST',
          content_id: this.promotion().id,
          report_reason: this.reportReason(),
          report_details: this.reportDetails().trim() || null,
        }),
      );
      if (res.status !== 'SUCCESS') {
        throw new Error(res.msgArr?.join(' ') || 'Unable to submit report right now.');
      }
      this.reportOpen.set(false);
      this.reportDetails.set('');
      this.reportFeedback.set('Report submitted for moderation review.');
    } catch (err) {
      this.reportError.set(
        err instanceof Error ? err.message : 'Unable to submit report right now.',
      );
    } finally {
      this.submittingReport.set(false);
    }
  }

  private readSavedIds(): Set<number> {
    try {
      const raw = globalThis.localStorage?.getItem(SAVED_PROMOTIONS_STORAGE_KEY);
      if (!raw) return new Set<number>();
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<number>();
      return new Set<number>(
        parsed.filter((item): item is number => typeof item === 'number' && Number.isInteger(item)),
      );
    } catch {
      return new Set<number>();
    }
  }

  private writeSavedIds(ids: Set<number>): void {
    try {
      globalThis.localStorage?.setItem(SAVED_PROMOTIONS_STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // Storage unavailable (private browsing / restricted context)
    }
  }
}
