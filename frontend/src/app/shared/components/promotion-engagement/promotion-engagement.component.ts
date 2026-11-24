import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthDialogService } from '../../../core/auth/auth-dialog.service';
import {
  ContentComment,
  ContentEngagementSummary,
  ReactionType,
} from '../../../core/engagement/engagement.models';
import { EngagementApiService } from '../../../core/engagement/engagement-api.service';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

export interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-promotion-engagement',
  standalone: true,
  imports: [DatePipe, FormsModule, SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './promotion-engagement.component.html',
  styleUrl: './promotion-engagement.component.scss',
})
export class PromotionEngagementComponent implements OnInit {
  private readonly api = inject(EngagementApiService);
  private readonly auth = inject(AuthService);
  private readonly authDialog = inject(AuthDialogService);

  readonly postId = input.required<number>();
  readonly postTitle = input<string>('Promotion');
  readonly mode = input<'card' | 'detail'>('card');
  readonly commentClick = output<void>();

  private readonly commentInputRef = viewChild<ElementRef<HTMLInputElement>>('commentInput');

  // Engagement Summary
  protected readonly summary = signal<ContentEngagementSummary>({
    total_likes: 0,
    user_reaction: null,
    reactions: { LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 },
    total_comments: 0,
    total_views: 0,
  });

  // Reaction Picker
  protected readonly showReactionPicker = signal(false);
  protected readonly reactionConfigs: ReactionConfig[] = [
    { type: 'LIKE', emoji: '👍', label: 'Like', color: 'var(--bbg-brand-primary)' },
    { type: 'LOVE', emoji: '❤️', label: 'Love', color: 'var(--bbg-danger)' },
    { type: 'HAHA', emoji: '😆', label: 'Haha', color: 'var(--bbg-warning)' },
    { type: 'WOW', emoji: '😮', label: 'Wow', color: 'var(--bbg-info)' },
    { type: 'SAD', emoji: '😢', label: 'Sad', color: 'var(--bbg-info)' },
    { type: 'ANGRY', emoji: '😡', label: 'Angry', color: 'var(--bbg-danger)' },
  ];

  // Comments & Pagination
  protected readonly commentsExpanded = signal(false);
  protected readonly comments = signal<ContentComment[]>([]);
  protected readonly commentPage = signal(1);
  protected readonly commentsPageSize = 10;
  protected readonly loadingComments = signal(false);
  protected readonly loadingMoreComments = signal(false);
  protected readonly newCommentText = signal('');
  protected readonly submittingComment = signal(false);
  protected readonly commentError = signal<string | null>(null);

  // Reply State
  protected readonly replyingTo = signal<ContentComment | null>(null);

  // Edit Comment State
  protected readonly editingCommentId = signal<number | null>(null);
  protected readonly editText = signal('');
  protected readonly submittingEdit = signal(false);

  // Comment-level Like & Report State (strictly independent of post-level reactions)
  protected readonly inFlightCommentLikes = signal<ReadonlySet<number>>(new Set());
  protected readonly reportedCommentIds = signal<ReadonlySet<number>>(new Set());
  protected readonly commentActionFeedback = signal<string | null>(null);

  // Share Notification
  protected readonly shareFeedback = signal<string | null>(null);

  protected readonly inFlightReaction = signal(false);

  protected readonly currentReactionConfig = computed(() => {
    const userReact = this.summary().user_reaction;
    if (!userReact) return null;
    const config = this.reactionConfigs.find((c) => c.type === userReact) ?? null;
    if (!config) return null;
    const labelMap: Record<ReactionType, string> = {
      LIKE: 'Liked',
      LOVE: 'Loved',
      HAHA: 'Haha',
      WOW: 'Wow',
      SAD: 'Sad',
      ANGRY: 'Angry',
    };
    return {
      ...config,
      activeLabel: labelMap[config.type] || config.label,
    };
  });

  protected readonly topReactionIcons = computed<string[]>(() => {
    const reactions = this.summary().reactions;
    const entries = Object.entries(reactions) as [ReactionType, number][];
    return entries
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => {
        const found = this.reactionConfigs.find((c) => c.type === type);
        return found?.emoji || '👍';
      });
  });

  protected readonly topLevelComments = computed<ContentComment[]>(() =>
    this.comments().filter((comment) => comment.parent_comment_id === null),
  );

  protected readonly repliesByParentId = computed<Map<number, ContentComment[]>>(() => {
    const map = new Map<number, ContentComment[]>();
    for (const comment of this.comments()) {
      if (comment.parent_comment_id !== null) {
        const existing = map.get(comment.parent_comment_id) ?? [];
        existing.push(comment);
        map.set(comment.parent_comment_id, existing);
      }
    }
    return map;
  });

  protected readonly hasMoreComments = computed<boolean>(
    () => this.comments().length < this.summary().total_comments,
  );

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.loadSummary();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadSummary();
    if (this.mode() === 'detail') {
      this.commentsExpanded.set(true);
      await this.loadComments(1, false);
    }
  }

  protected async loadSummary(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getEngagementSummary('POST', this.postId()));
      if (res.status === 'SUCCESS' && res.data && !Array.isArray(res.data)) {
        this.summary.set(res.data);
      }
    } catch {
      // Ignored
    }
  }

  protected toggleReactionPicker(): void {
    this.showReactionPicker.update((v) => !v);
  }

  protected openReactionPicker(): void {
    this.showReactionPicker.set(true);
  }

  protected closeReactionPicker(): void {
    this.showReactionPicker.set(false);
  }

  protected async onQuickLikeClick(event?: Event): Promise<void> {
    const anchor = (event?.currentTarget as HTMLElement) ?? null;
    const current = this.summary().user_reaction;
    const targetType: ReactionType = current ? current : 'LIKE';
    await this.selectReaction(targetType, anchor);
  }

  protected async selectReaction(
    type: ReactionType,
    anchor: HTMLElement | null = null,
  ): Promise<void> {
    if (this.inFlightReaction()) {
      return;
    }
    this.closeReactionPicker();

    void this.authDialog.requireAuthentication(
      'Sign in to react to this promotional post',
      anchor,
      async () => {
        if (this.inFlightReaction()) {
          return;
        }
        this.inFlightReaction.set(true);
        const prevSummary = this.summary();
        const prevUserReaction = prevSummary.user_reaction;
        const isUnreact = prevUserReaction === type;
        const nextUserReaction = isUnreact ? null : type;

        const nextLikesCount = isUnreact
          ? Math.max(0, prevSummary.total_likes - 1)
          : prevUserReaction
            ? prevSummary.total_likes
            : prevSummary.total_likes + 1;

        const nextReactions = { ...prevSummary.reactions };
        if (prevUserReaction) {
          nextReactions[prevUserReaction] = Math.max(0, (nextReactions[prevUserReaction] || 1) - 1);
        }
        if (!isUnreact) {
          nextReactions[type] = (nextReactions[type] || 0) + 1;
        }

        // Optimistic update
        this.summary.set({
          ...prevSummary,
          user_reaction: nextUserReaction,
          total_likes: nextLikesCount,
          reactions: nextReactions,
        });

        try {
          const res = await firstValueFrom(
            this.api.toggleReaction({
              content_type: 'POST',
              content_id: this.postId(),
              reaction_type: type,
            }),
          );
          if (res.status === 'SUCCESS' && res.data && !Array.isArray(res.data)) {
            const reactionData = res.data as Partial<ContentEngagementSummary>;
            this.summary.update((prev) => ({
              ...prev,
              ...reactionData,
              total_comments: prev.total_comments,
              total_views: prev.total_views,
            }));
          }
        } catch {
          this.summary.set(prevSummary);
        } finally {
          this.inFlightReaction.set(false);
        }
      },
    );
  }

  protected onCommentClick(event?: Event): void {
    event?.stopPropagation();
    if (this.mode() === 'card') {
      this.commentClick.emit();
      return;
    }
    this.commentsExpanded.set(true);
    if (this.comments().length === 0) {
      void this.loadComments(1, false);
    }
    setTimeout(() => this.commentInputRef()?.nativeElement.focus(), 0);
  }

  protected toggleComments(): void {
    const next = !this.commentsExpanded();
    this.commentsExpanded.set(next);
    if (next) {
      if (this.comments().length === 0) {
        void this.loadComments(1, false);
      }
      setTimeout(() => this.commentInputRef()?.nativeElement.focus(), 0);
    }
  }

  protected async loadComments(page = 1, append = false): Promise<void> {
    if (append) {
      this.loadingMoreComments.set(true);
    } else {
      this.loadingComments.set(true);
    }
    try {
      const res = await firstValueFrom(
        this.api.getComments('POST', this.postId(), page, this.commentsPageSize),
      );
      if (res.status === 'SUCCESS' && res.data && !Array.isArray(res.data)) {
        const data = res.data as {
          items: ContentComment[];
          pagination: { page: number; page_size: number; total_count: number };
        };
        this.commentPage.set(page);
        if (append) {
          this.comments.update((existing) => {
            const seen = new Set(existing.map((c) => c.id));
            const merged = [...existing];
            for (const item of data.items) {
              if (!seen.has(item.id)) {
                merged.push(item);
              }
            }
            return merged;
          });
        } else {
          this.comments.set(data.items);
        }
        this.summary.update((s) => ({
          ...s,
          total_comments: data.pagination.total_count,
        }));
      }
    } catch {
      // Ignored
    } finally {
      this.loadingComments.set(false);
      this.loadingMoreComments.set(false);
    }
  }

  protected loadMoreComments(): void {
    if (this.loadingMoreComments() || !this.hasMoreComments()) return;
    void this.loadComments(this.commentPage() + 1, true);
  }

  protected getRepliesFor(commentId: number): ContentComment[] {
    return this.repliesByParentId().get(commentId) ?? [];
  }

  protected startReply(comment: ContentComment): void {
    this.replyingTo.set(comment);
    this.commentError.set(null);
    setTimeout(() => this.commentInputRef()?.nativeElement.focus(), 0);
  }

  protected cancelReply(): void {
    this.replyingTo.set(null);
  }

  protected async submitComment(event?: Event): Promise<void> {
    const text = this.newCommentText().trim();
    if (!text) return;

    const anchor = (event?.currentTarget as HTMLElement) ?? null;
    const parentId = this.replyingTo()?.id ?? null;

    void this.authDialog.requireAuthentication(
      'Sign in to comment on this promotional post',
      anchor,
      async () => {
        this.submittingComment.set(true);
        this.commentError.set(null);

        try {
          const res = await firstValueFrom(
            this.api.createComment({
              content_type: 'POST',
              content_id: this.postId(),
              comment_text: text,
              ...(parentId !== null ? { parent_comment_id: parentId } : {}),
            }),
          );

          if (res.status !== 'SUCCESS') {
            throw new Error(res.msgArr?.join(' ') || 'Could not post comment.');
          }

          this.newCommentText.set('');
          this.replyingTo.set(null);
          await this.loadComments(1, false);
        } catch (err) {
          this.commentError.set(err instanceof Error ? err.message : 'Unable to post comment.');
        } finally {
          this.submittingComment.set(false);
        }
      },
    );
  }

  protected startEditComment(comment: ContentComment): void {
    this.editingCommentId.set(comment.id);
    this.editText.set(comment.comment_text);
  }

  protected cancelEditComment(): void {
    this.editingCommentId.set(null);
    this.editText.set('');
  }

  protected async saveEditComment(commentId: number): Promise<void> {
    const text = this.editText().trim();
    if (!text) return;

    this.submittingEdit.set(true);
    try {
      const res = await firstValueFrom(
        this.api.updateComment({
          content_type: 'POST',
          content_id: this.postId(),
          comment_id: commentId,
          comment_text: text,
        }),
      );

      if (res.status === 'SUCCESS') {
        this.comments.update((list) =>
          list.map((c) => (c.id === commentId ? { ...c, comment_text: text } : c)),
        );
        this.cancelEditComment();
      }
    } catch {
      // Ignored
    } finally {
      this.submittingEdit.set(false);
    }
  }

  protected isCommentLikePending(commentId: number): boolean {
    return this.inFlightCommentLikes().has(commentId);
  }

  protected isCommentReported(commentId: number): boolean {
    return this.reportedCommentIds().has(commentId);
  }

  protected toggleCommentLike(comment: ContentComment, event?: Event): void {
    if (this.isCommentLikePending(comment.id)) return;
    const anchor = (event?.currentTarget as HTMLElement) ?? null;

    void this.authDialog.requireAuthentication('Sign in to like this comment', anchor, async () => {
      if (this.isCommentLikePending(comment.id)) return;
      this.inFlightCommentLikes.update((set) => {
        const next = new Set(set);
        next.add(comment.id);
        return next;
      });

      const prevLiked = !!comment.user_liked;
      const prevCount = comment.like_count ?? 0;
      const nextLiked = !prevLiked;
      const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

      this.comments.update((list) =>
        list.map((c) =>
          c.id === comment.id ? { ...c, user_liked: nextLiked, like_count: nextCount } : c,
        ),
      );

      try {
        const res = await firstValueFrom(
          this.api.toggleReaction({
            content_type: 'COMMENT',
            content_id: comment.id,
            reaction_type: 'LIKE',
          }),
        );
        if (res.status === 'SUCCESS' && res.data && !Array.isArray(res.data)) {
          const data = res.data;
          this.comments.update((list) =>
            list.map((c) =>
              c.id === comment.id
                ? {
                    ...c,
                    user_liked: data.user_reaction !== null,
                    like_count: data.total_likes,
                  }
                : c,
            ),
          );
        }
      } catch {
        this.comments.update((list) =>
          list.map((c) =>
            c.id === comment.id ? { ...c, user_liked: prevLiked, like_count: prevCount } : c,
          ),
        );
      } finally {
        this.inFlightCommentLikes.update((set) => {
          const next = new Set(set);
          next.delete(comment.id);
          return next;
        });
      }
    });
  }

  protected reportComment(comment: ContentComment, event?: Event): void {
    if (this.isCommentReported(comment.id)) return;
    const anchor = (event?.currentTarget as HTMLElement) ?? null;

    void this.authDialog.requireAuthentication(
      'Sign in to report this comment',
      anchor,
      async () => {
        try {
          const res = await firstValueFrom(
            this.api.reportContent({
              content_type: 'COMMENT',
              content_id: comment.id,
              report_reason: 'INAPPROPRIATE',
              report_details: null,
            }),
          );
          if (res.status === 'SUCCESS') {
            this.reportedCommentIds.update((set) => {
              const next = new Set(set);
              next.add(comment.id);
              return next;
            });
            this.commentActionFeedback.set('Comment reported for moderation review.');
            setTimeout(() => this.commentActionFeedback.set(null), 2500);
          }
        } catch {
          this.commentActionFeedback.set('Unable to report comment right now.');
          setTimeout(() => this.commentActionFeedback.set(null), 2500);
        }
      },
    );
  }

  protected async deleteComment(commentId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await firstValueFrom(
        this.api.deleteComment({
          content_type: 'POST',
          content_id: this.postId(),
          comment_id: commentId,
        }),
      );

      if (res.status === 'SUCCESS') {
        this.comments.update((list) =>
          list.filter((c) => c.id !== commentId && c.parent_comment_id !== commentId),
        );
        this.summary.update((s) => ({
          ...s,
          total_comments: Math.max(0, s.total_comments - 1),
        }));
      }
    } catch {
      // Ignored
    }
  }

  protected async sharePost(): Promise<void> {
    const url = window.location.href;
    const title = this.postTitle();

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      this.shareFeedback.set('Link copied to clipboard!');
      setTimeout(() => this.shareFeedback.set(null), 2500);
    } catch {
      this.shareFeedback.set('Unable to copy link.');
      setTimeout(() => this.shareFeedback.set(null), 2500);
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
}
