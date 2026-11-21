export interface ProductReviewMedia {
  id?: number;
  review_id?: number;
  media_url: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  display_order?: number;
}

export interface ProductReview {
  id: number;
  tenant_id: number;
  product_id: number;
  business_id: number;
  user_id: number;
  author_name: string;
  rating: number; // 1 - 5
  review_title: string | null;
  review_text: string;
  review_status: 'PUBLISHED' | 'PENDING' | 'FLAGGED' | 'HIDDEN';
  is_verified_purchase: boolean;
  helpful_count: number;
  reviewed_on: string;
  user_voted_helpful: boolean;
  is_author: boolean;
  media?: ProductReviewMedia[];
}

export interface RatingDistributionBucket {
  count: number;
  percentage: number;
}

export interface ProductRatingSummary {
  product_id: number;
  average_rating: number;
  total_reviews: number;
  distribution: {
    1: RatingDistributionBucket;
    2: RatingDistributionBucket;
    3: RatingDistributionBucket;
    4: RatingDistributionBucket;
    5: RatingDistributionBucket;
  };
}

export interface ProductReviewsListResponse {
  items: ProductReview[];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
}

export interface CreateProductReviewDto {
  product_id: number;
  rating: number;
  review_title?: string | null;
  review_text: string;
  media?: Array<{
    media_url: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
  }>;
}

export interface UpdateProductReviewDto {
  review_id: number;
  rating: number;
  review_title?: string | null;
  review_text: string;
}

export interface ReportProductReviewDto {
  review_id: number;
  report_reason: string;
  report_details?: string | null;
}
