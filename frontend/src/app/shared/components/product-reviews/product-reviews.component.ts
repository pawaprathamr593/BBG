import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthDialogService } from '../../../core/auth/auth-dialog.service';
import { ProductReview, ProductRatingSummary } from '../../../core/reviews/product-review.models';
import { ProductReviewApiService } from '../../../core/reviews/product-review-api.service';
import { S3UploadService } from '../../../core/storage/s3-upload.service';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { RatingSummaryComponent } from '../rating-summary/rating-summary.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    StarRatingComponent,
    RatingSummaryComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-reviews.component.html',
  styleUrl: './product-reviews.component.scss',
})
export class ProductReviewsComponent implements OnInit {
  private readonly api = inject(ProductReviewApiService);
  private readonly auth = inject(AuthService);
  private readonly authDialog = inject(AuthDialogService);
  private readonly s3Upload = inject(S3UploadService);

  readonly productId = input.required<number>();
  readonly productName = input<string>('Product');

  protected readonly reviews = signal<ProductReview[]>([]);
  protected readonly summary = signal<ProductRatingSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalCount = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly sortBy = signal<'NEWEST' | 'RATING_HIGH' | 'RATING_LOW' | 'MOST_HELPFUL'>(
    'NEWEST',
  );
  protected readonly selectedStarFilter = signal<number | null>(null);

  // Composer Form
  protected readonly showWriteForm = signal(false);
  protected readonly submitting = signal(false);
  protected readonly uploadingMedia = signal(false);
  protected readonly uploadProgress = signal(0);
  protected readonly submitSuccess = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected readonly formRating = signal(5);
  protected readonly formTitle = signal('');
  protected readonly formText = signal('');
  protected readonly formMedia = signal<
    Array<{ media_url: string; file_name: string; preview_url?: string; file_size?: number; mime_type?: string }>
  >([]);

  // Editing state
  protected readonly editingReviewId = signal<number | null>(null);
  protected readonly editRating = signal(5);
  protected readonly editTitle = signal('');
  protected readonly editText = signal('');
  protected readonly editMedia = signal<
    Array<{ id: string | number; url: string; name: string }>
  >([]);
  protected readonly editSubmitting = signal(false);

  // Reporting modal
  protected readonly reportingReviewId = signal<number | null>(null);
  protected readonly reportReason = signal('Spam or inappropriate content');
  protected readonly reportDetails = signal('');
  protected readonly reportSubmitting = signal(false);
  protected readonly reportSuccess = signal<string | null>(null);

  // Lightbox / Image Detail Modal
  protected readonly activeMediaUrl = signal<string | null>(null);
  protected readonly activeReviewModal = signal<{
    review: ProductReview;
    mediaList: Array<{ id: string | number; url: string; name: string }>;
    activeIndex: number;
  } | null>(null);

  protected readonly filteredReviews = computed(() => {
    const list = this.reviews();
    const star = this.selectedStarFilter();
    if (star === null) {
      return list;
    }
    return list.filter((r) => r.rating === star);
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  protected async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [reviewsRes, summaryRes] = await Promise.all([
        firstValueFrom(
          this.api.getProductReviews(this.productId(), this.page(), this.pageSize(), this.sortBy()),
        ),
        firstValueFrom(this.api.getProductRatingSummary(this.productId())),
      ]);

      if (reviewsRes.status === 'SUCCESS' && reviewsRes.data && !Array.isArray(reviewsRes.data)) {
        this.reviews.set(reviewsRes.data.items);
        this.totalCount.set(reviewsRes.data.pagination.total_count);
        this.totalPages.set(reviewsRes.data.pagination.total_pages);
      }

      if (summaryRes.status === 'SUCCESS' && summaryRes.data && !Array.isArray(summaryRes.data)) {
        this.summary.set(summaryRes.data);
      }
    } catch {
      // Handled gracefully in UI empty state
    } finally {
      this.loading.set(false);
    }
  }

  protected onSortChange(sort: 'NEWEST' | 'RATING_HIGH' | 'RATING_LOW' | 'MOST_HELPFUL'): void {
    this.sortBy.set(sort);
    this.page.set(1);
    void this.loadReviewsOnly();
  }

  protected onStarFilter(star: number | null): void {
    this.selectedStarFilter.set(star);
  }

  protected async loadReviewsOnly(): Promise<void> {
    try {
      const reviewsRes = await firstValueFrom(
        this.api.getProductReviews(this.productId(), this.page(), this.pageSize(), this.sortBy()),
      );
      if (reviewsRes.status === 'SUCCESS' && reviewsRes.data && !Array.isArray(reviewsRes.data)) {
        this.reviews.set(reviewsRes.data.items);
        this.totalCount.set(reviewsRes.data.pagination.total_count);
        this.totalPages.set(reviewsRes.data.pagination.total_pages);
      }
    } catch {
      // Ignored
    }
  }

  protected openWriteForm(event?: Event): void {
    const anchor = (event?.currentTarget as HTMLElement) ?? null;
    void this.authDialog.requireAuthentication(
      'Sign in to write a review for this product',
      anchor,
      () => {
        this.showWriteForm.set(true);
        this.submitSuccess.set(null);
        this.submitError.set(null);
      },
    );
  }

  protected closeWriteForm(): void {
    for (const item of this.formMedia()) {
      if (item.preview_url) {
        URL.revokeObjectURL(item.preview_url);
      }
    }
    this.showWriteForm.set(false);
    this.formRating.set(5);
    this.formTitle.set('');
    this.formText.set('');
    this.formMedia.set([]);
    this.uploadingMedia.set(false);
    this.uploadProgress.set(0);
    this.submitError.set(null);
  }

  protected async onMediaFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.submitError.set('Only JPG, PNG, and WebP images are allowed.');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.submitError.set('Image size must not exceed 5MB.');
      input.value = '';
      return;
    }

    this.uploadingMedia.set(true);
    this.uploadProgress.set(0);
    this.submitError.set(null);

    try {
      const presignRes = await firstValueFrom(
        this.api.getReviewMediaUploadUrl(this.productId(), file),
      );
      if (presignRes.status !== 'SUCCESS' || !presignRes.data || Array.isArray(presignRes.data)) {
        throw new Error(presignRes.msgArr?.join(' ') || 'Could not prepare image upload.');
      }

      const { upload_url, object_key, required_headers } = presignRes.data;
      await this.s3Upload.upload(upload_url, file, required_headers, (progress) => {
        this.uploadProgress.set(progress);
      });

      const previewUrl = URL.createObjectURL(file);
      this.formMedia.update((m) => [
        ...m,
        {
          media_url: object_key,
          file_name: file.name,
          preview_url: previewUrl,
          file_size: file.size,
          mime_type: file.type,
        },
      ]);
      input.value = '';
    } catch (err) {
      this.submitError.set(this.auth.errorMessage(err));
    } finally {
      this.uploadingMedia.set(false);
      this.uploadProgress.set(0);
    }
  }

  protected addMediaUrl(urlInput: HTMLInputElement): void {
    const url = urlInput.value.trim();
    if (!url) return;
    try {
      new URL(url);
      const fileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0] || 'Image';
      this.formMedia.update((m) => [...m, { media_url: url, file_name: fileName }]);
      urlInput.value = '';
    } catch {
      this.submitError.set('Please enter a valid media image URL.');
    }
  }

  protected removeMedia(index: number): void {
    this.formMedia.update((m) => {
      const item = m[index];
      if (item?.preview_url) {
        URL.revokeObjectURL(item.preview_url);
      }
      return m.filter((_, i) => i !== index);
    });
  }

  protected async submitReview(): Promise<void> {
    const text = this.formText().trim();
    if (!text || text.length < 5) {
      this.submitError.set('Please provide a detailed review of at least 5 characters.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      const payloadMedia = this.formMedia().map((item) => ({
        media_url: item.media_url,
        file_name: item.file_name,
      }));

      const response = await firstValueFrom(
        this.api.createReview({
          product_id: this.productId(),
          rating: this.formRating(),
          review_title: this.formTitle().trim() || null,
          review_text: text,
          media: payloadMedia,
        }),
      );

      if (response.status !== 'SUCCESS') {
        throw new Error(response.msgArr?.join(' ') || 'Could not submit review.');
      }

      this.submitSuccess.set('Thank you! Your product review has been published.');
      this.closeWriteForm();
      await this.loadData();
    } catch (err) {
      this.submitError.set(this.auth.errorMessage(err));
    } finally {
      this.submitting.set(false);
    }
  }

  protected async toggleHelpful(review: ProductReview, event?: Event): Promise<void> {
    const anchor = (event?.currentTarget as HTMLElement) ?? null;
    void this.authDialog.requireAuthentication(
      'Sign in to vote this review as helpful',
      anchor,
      async () => {
        // Optimistic toggle
        const prevVoted = review.user_voted_helpful;
        const prevCount = review.helpful_count;
        const nextVoted = !prevVoted;
        const nextCount = nextVoted ? prevCount + 1 : Math.max(0, prevCount - 1);

        this.reviews.update((list) =>
          list.map((r) =>
            r.id === review.id
              ? { ...r, user_voted_helpful: nextVoted, helpful_count: nextCount }
              : r,
          ),
        );

        try {
          const res = await firstValueFrom(this.api.voteHelpful(review.id));
          if (res.status === 'SUCCESS' && res.data && !Array.isArray(res.data)) {
            const data = res.data as {
              review_id: number;
              user_voted_helpful: boolean;
              helpful_count: number;
            };
            this.reviews.update((list) =>
              list.map((r) =>
                r.id === review.id
                  ? {
                      ...r,
                      user_voted_helpful: data.user_voted_helpful,
                      helpful_count: data.helpful_count,
                    }
                  : r,
              ),
            );
          }
        } catch {
          // Revert on failure
          this.reviews.update((list) =>
            list.map((r) =>
              r.id === review.id
                ? { ...r, user_voted_helpful: prevVoted, helpful_count: prevCount }
                : r,
            ),
          );
        }
      },
    );
  }

  protected startEditing(review: ProductReview): void {
    this.editingReviewId.set(review.id);
    this.editRating.set(review.rating);
    this.editTitle.set(review.review_title || '');
    this.editText.set(review.review_text);
    this.editMedia.set(this.getReviewMedia(review));
  }

  protected cancelEditing(): void {
    this.editingReviewId.set(null);
    this.editMedia.set([]);
  }

  protected removeEditMedia(index: number): void {
    this.editMedia.update((list) => list.filter((_, i) => i !== index));
  }

  protected async saveEdit(reviewId: number): Promise<void> {
    const text = this.editText().trim();
    if (!text || text.length < 5) return;

    this.editSubmitting.set(true);
    try {
      const remainingMedia = this.editMedia();
      const payloadMedia = remainingMedia.map((m) => ({
        id: typeof m.id === 'number' ? m.id : undefined,
        media_url: m.url,
        file_name: m.name,
      }));

      const res = await firstValueFrom(
        this.api.updateReview({
          review_id: reviewId,
          rating: this.editRating(),
          review_title: this.editTitle().trim() || null,
          review_text: text,
          media: payloadMedia,
        }),
      );

      if (res.status === 'SUCCESS') {
        this.reviews.update((list) =>
          list.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  rating: this.editRating(),
                  review_title: this.editTitle().trim() || null,
                  review_text: text,
                  media: remainingMedia.map((m) => ({
                    id: typeof m.id === 'number' ? m.id : undefined,
                    media_url: m.url,
                    file_name: m.name,
                  })),
                }
              : r,
          ),
        );
        this.editingReviewId.set(null);
        this.editMedia.set([]);
        void this.loadSummaryOnly();
      }
    } catch {
      // Ignored
    } finally {
      this.editSubmitting.set(false);
    }
  }

  protected async deleteReview(reviewId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      const res = await firstValueFrom(this.api.deleteReview(reviewId));
      if (res.status === 'SUCCESS') {
        this.reviews.update((list) => list.filter((r) => r.id !== reviewId));
        this.totalCount.update((cnt) => Math.max(0, cnt - 1));
        void this.loadSummaryOnly();
      }
    } catch {
      // Ignored
    }
  }

  private async loadSummaryOnly(): Promise<void> {
    try {
      const summaryRes = await firstValueFrom(this.api.getProductRatingSummary(this.productId()));
      if (summaryRes.status === 'SUCCESS' && summaryRes.data && !Array.isArray(summaryRes.data)) {
        this.summary.set(summaryRes.data);
      }
    } catch {
      // Ignored
    }
  }

  protected openReportModal(reviewId: number, event?: Event): void {
    const anchor = (event?.currentTarget as HTMLElement) ?? null;
    void this.authDialog.requireAuthentication('Sign in to report this review', anchor, () => {
      this.reportingReviewId.set(reviewId);
      this.reportReason.set('Spam or inappropriate content');
      this.reportDetails.set('');
      this.reportSuccess.set(null);
    });
  }

  protected closeReportModal(): void {
    this.reportingReviewId.set(null);
  }

  protected async submitReport(): Promise<void> {
    const revId = this.reportingReviewId();
    if (!revId) return;

    this.reportSubmitting.set(true);
    try {
      const res = await firstValueFrom(
        this.api.reportReview({
          review_id: revId,
          report_reason: this.reportReason(),
          report_details: this.reportDetails().trim() || null,
        }),
      );

      if (res.status === 'SUCCESS') {
        this.reportSuccess.set('Report submitted. Thank you for helping keep BBG safe.');
        setTimeout(() => this.closeReportModal(), 1800);
      }
    } catch {
      // Ignored
    } finally {
      this.reportSubmitting.set(false);
    }
  }

  protected prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      void this.loadReviewsOnly();
    }
  }

  protected nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      void this.loadReviewsOnly();
    }
  }

  protected getAuthorMonogram(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  protected getReviewMedia(review: any): Array<{ id: string | number; url: string; name: string }> {
    let raw = review?.media || review?.images || review?.attachments;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((item: any, idx: number) => {
        let url = '';
        let name = '';
        let id: string | number = idx;
        if (typeof item === 'string') {
          url = item;
          name = 'Review photo ' + (idx + 1);
        } else if (item && typeof item === 'object') {
          url = item.media_url || item.url || item.image_url || item.thumbnail_url || item.path || '';
          name = item.file_name || item.name || 'Review photo ' + (idx + 1);
          id = item.id ?? idx;
        }
        url = url.trim();
        if (!url) return null;

        // Resolve relative S3 object keys to full bucket URL
        if (
          !url.startsWith('http://') &&
          !url.startsWith('https://') &&
          !url.startsWith('data:') &&
          !url.startsWith('blob:')
        ) {
          url = `https://bbg-839544975641-ap-south-1-an.s3.ap-south-1.amazonaws.com/${url.replace(/^\/+/, '')}`;
        }

        return { id, url, name };
      })
      .filter((item): item is { id: string | number; url: string; name: string } => item !== null);
  }

  protected openReviewMediaModal(review: ProductReview, mediaIndex: number = 0, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const mediaList = this.getReviewMedia(review);
    if (!mediaList.length) return;
    const clampedIndex = Math.max(0, Math.min(mediaIndex, mediaList.length - 1));
    this.activeReviewModal.set({
      review,
      mediaList,
      activeIndex: clampedIndex,
    });
  }

  protected closeReviewMediaModal(): void {
    this.activeReviewModal.set(null);
  }

  protected nextModalMedia(event?: Event): void {
    if (event) event.stopPropagation();
    this.activeReviewModal.update((state) => {
      if (!state || state.mediaList.length <= 1) return state;
      const nextIdx = (state.activeIndex + 1) % state.mediaList.length;
      return { ...state, activeIndex: nextIdx };
    });
  }

  protected prevModalMedia(event?: Event): void {
    if (event) event.stopPropagation();
    this.activeReviewModal.update((state) => {
      if (!state || state.mediaList.length <= 1) return state;
      const prevIdx = (state.activeIndex - 1 + state.mediaList.length) % state.mediaList.length;
      return { ...state, activeIndex: prevIdx };
    });
  }

  protected selectModalMediaIndex(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.activeReviewModal.update((state) => {
      if (!state) return state;
      return { ...state, activeIndex: index };
    });
  }

  protected onMediaThumbError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset['fallback']) {
      img.dataset['fallback'] = 'true';
      img.src =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="%23222" stroke="%23888" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
    }
  }

  protected openLightbox(url: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.activeMediaUrl.set(url);
  }

  protected closeLightbox(): void {
    this.activeMediaUrl.set(null);
  }
}
