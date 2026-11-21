export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface ReactionCounts {
  LIKE: number;
  LOVE: number;
  HAHA: number;
  WOW: number;
  SAD: number;
  ANGRY: number;
}

export interface ContentEngagementSummary {
  total_likes: number;
  user_reaction: ReactionType | null;
  reactions: ReactionCounts;
  total_comments: number;
  total_views: number;
}

export interface ContentComment {
  id: number;
  tenant_id: number;
  user_id: number;
  author_name: string;
  parent_comment_id: number | null;
  comment_text: string;
  commented_on: string;
  is_author: boolean;
  like_count?: number;
  user_liked?: boolean;
}

export interface CommentListResponse {
  items: ContentComment[];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
  };
}

export interface CreateCommentDto {
  content_type: 'POST' | 'PRODUCT' | 'BUSINESS';
  content_id: number;
  comment_text: string;
  parent_comment_id?: number | null;
}

export interface UpdateCommentDto {
  content_type: 'POST' | 'PRODUCT' | 'BUSINESS';
  content_id: number;
  comment_id: number;
  comment_text: string;
}

export interface DeleteCommentDto {
  content_type: 'POST' | 'PRODUCT' | 'BUSINESS';
  content_id: number;
  comment_id: number;
}

export interface ToggleReactionDto {
  content_type: 'POST' | 'PRODUCT' | 'BUSINESS' | 'COMMENT';
  content_id: number;
  reaction_type?: ReactionType;
}

export interface ReportContentDto {
  content_type: 'POST' | 'PRODUCT' | 'BUSINESS' | 'COMMENT';
  content_id: number;
  report_reason: string;
  report_details?: string | null;
}
