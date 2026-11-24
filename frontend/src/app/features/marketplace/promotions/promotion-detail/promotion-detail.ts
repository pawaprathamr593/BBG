import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthDialogService } from '../../../../core/auth/auth-dialog.service';
import { EngagementApiService } from '../../../../core/engagement/engagement-api.service';
import {
  MarketplaceApiService,
  MarketplaceMedia,
  MarketplacePromotion,
} from '../../../../core/marketplace/marketplace-api.service';
import {
  BreadcrumbsComponent,
  BreadcrumbItem,
} from '../../../../shared/components/breadcrumbs/breadcrumbs.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PromotionEngagementComponent } from '../../../../shared/components/promotion-engagement/promotion-engagement.component';
import { SkeletonLoaderComponent } from '../../../../shared/components/skeleton-loader/skeleton-loader.component';

const SAVED_PROMOTIONS_STORAGE_KEY = 'bbg_saved_promotions_v1';

@Component({
  selector: 'app-promotion-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    BreadcrumbsComponent,
    PromotionEngagementComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './promotion-detail.html',
  styleUrl: './promotion-detail.scss',
})
export class PromotionDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(MarketplaceApiService);
  private readonly engagementApi = inject(EngagementApiService);
  private readonly authDialog = inject(AuthDialogService);

  private readonly commentsAnchorRef = viewChild<ElementRef<HTMLElement>>('commentsAnchor');

  readonly promotion = signal<MarketplacePromotion | null>(null);
  readonly mediaList = signal<MarketplaceMedia[]>([]);
  readonly selectedMedia = signal<MarketplaceMedia | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  protected readonly logoError = signal(false);
  protected readonly isSaved = signal(false);
  protected readonly saveFeedback = signal<string | null>(null);
  protected readonly shareFeedback = signal<string | null>(null);

  // Report panel state
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

  /**
   * Authoritative primary media selection:
   * 1. If user selected an active thumbnail from the media gallery, show it.
   * 2. Else resolve primary image: is_primary === 1 || display_order === 0 with media_type === 'IMAGE'.
   * 3. Else fallback to first available image or first media item.
   */
  readonly activeMedia = computed<MarketplaceMedia | null>(() => {
    const current = this.selectedMedia();
    if (current) return current;
    const list = this.mediaList();
    if (!list.length) return null;

    const images = list.filter((m) => m.media_type === 'IMAGE' && !!m.url);
    if (images.length > 0) {
      const explicit = images.find(
        (m) => m.is_primary === 1 || (m as { display_order?: number }).display_order === 0,
      );
      if (explicit) return explicit;
      return images[0];
    }
    return list[0];
  });

  readonly businessLocation = computed<string | null>(() => {
    const p = this.promotion();
    if (!p) return null;
    const city = (p.city || '').trim();
    const state = (p.state || '').trim();
    if (city && state) return `${city}, ${state}`;
    return city || state || null;
  });

  readonly businessMonogram = computed<string>(() => {
    const name = (this.promotion()?.business_name || '').trim();
    if (!name) return 'B';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  readonly isExpired = computed<boolean>(() => {
    const validUntil = this.promotion()?.valid_until;
    if (!validUntil) return false;
    const expiry = new Date(validUntil).getTime();
    return !Number.isNaN(expiry) && expiry < Date.now();
  });

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const promo = this.promotion();
    return [
      { label: 'Home', url: '/' },
      { label: 'Promotions', url: '/promotions' },
      { label: promo?.post_title || 'Promotion Details' },
    ];
  });

  constructor() {
    effect(() => {
      const promo = this.promotion();
      if (promo) {
        this.logoError.set(false);
        this.isSaved.set(this.readSavedIds().has(promo.id));
      }
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const promotionId = Number.parseInt(idParam || '', 10);
    if (!Number.isInteger(promotionId) || promotionId <= 0) {
      this.error.set('Invalid promotion identifier.');
      this.loading.set(false);
      return;
    }

    this.loadPromotion(promotionId);
  }

  protected selectMedia(item: MarketplaceMedia): void {
    this.selectedMedia.set(item);
  }

  protected onLogoError(): void {
    this.logoError.set(true);
  }

  protected goBack(): void {
    void this.router.navigate(['/promotions']);
  }

  protected toggleSave(): void {
    const promo = this.promotion();
    if (!promo) return;
    const id = promo.id;
    const savedIds = this.readSavedIds();
    const nextSaved = !this.isSaved();
    if (nextSaved) {
      savedIds.add(id);
    } else {
      savedIds.delete(id);
    }
    this.writeSavedIds(savedIds);
    this.isSaved.set(nextSaved);
    this.saveFeedback.set(nextSaved ? 'Promotion saved to bookmarks.' : 'Removed from bookmarks.');
    setTimeout(() => this.saveFeedback.set(null), 2200);
  }

  protected async copyShareLink(): Promise<void> {
    const url = globalThis.location?.href || '';
    if (!url) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      this.shareFeedback.set('Link copied to clipboard!');
      setTimeout(() => this.shareFeedback.set(null), 2500);
    } catch {
      this.shareFeedback.set('Unable to copy link.');
      setTimeout(() => this.shareFeedback.set(null), 2500);
    }
  }

  protected toggleReportPanel(event: Event): void {
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
    const promo = this.promotion();
    if (!promo || this.submittingReport()) return;
    this.submittingReport.set(true);
    this.reportError.set(null);

    try {
      const res = await firstValueFrom(
        this.engagementApi.reportContent({
          content_type: 'POST',
          content_id: promo.id,
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

  private loadPromotion(promotionId: number): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getPublicPromotion(promotionId).subscribe({
      next: (response) => {
        if (
          response.status !== 'SUCCESS' ||
          !response.data ||
          Array.isArray(response.data) ||
          !response.data.promotion
        ) {
          this.error.set(
            response.msgArr?.join(' ') || 'This promotion is unavailable or has expired.',
          );
          this.promotion.set(null);
          this.mediaList.set([]);
        } else {
          const promo = response.data.promotion;
          const media = response.data.media || promo.media || [];
          this.promotion.set(promo);
          this.mediaList.set(media);

          // If fragment is 'comments', auto-scroll smoothly to the comments section
          if (this.route.snapshot.fragment === 'comments') {
            setTimeout(() => {
              const el = this.commentsAnchorRef()?.nativeElement;
              if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 300);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('We could not load this promotion. Please try again.');
        this.loading.set(false);
      },
    });
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
      // Storage unavailable
    }
  }
}
