import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiResponse } from '../auth/auth.models';
import {
  CreateProductReviewDto,
  ProductRatingSummary,
  ProductReviewsListResponse,
  ReportProductReviewDto,
  UpdateProductReviewDto,
} from './product-review.models';

@Injectable({ providedIn: 'root' })
export class ProductReviewApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getProductReviews(
    productId: number,
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = 'NEWEST',
  ): Observable<ApiResponse<ProductReviewsListResponse>> {
    return this.http.post<ApiResponse<ProductReviewsListResponse>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/reviews/list`,
      {
        productReviewParam: {
          actionType: 'listProductReviews',
          actionData: {
            product_id: productId,
            page,
            page_size: pageSize,
            sort_by: sortBy,
          },
        },
      },
      { withCredentials: true },
    );
  }

  getProductRatingSummary(productId: number): Observable<ApiResponse<ProductRatingSummary>> {
    return this.http.post<ApiResponse<ProductRatingSummary>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/reviews/summary`,
      {
        productReviewParam: {
          actionType: 'getProductRatingSummary',
          actionData: { product_id: productId },
        },
      },
      { withCredentials: true },
    );
  }

  createReview(
    dto: CreateProductReviewDto,
  ): Observable<ApiResponse<{ id: number; review_status: string }>> {
    return this.http.post<ApiResponse<{ id: number; review_status: string }>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/reviews/create`,
      {
        productReviewParam: {
          actionType: 'createProductReview',
          actionData: dto,
        },
      },
      { withCredentials: true },
    );
  }

  getReviewMediaUploadUrl(
    productId: number,
    file: File,
  ): Observable<
    ApiResponse<{
      upload_url: string;
      object_key: string;
      expires_in: number;
      required_headers: Record<string, string>;
    }>
  > {
    return this.http.post<
      ApiResponse<{
        upload_url: string;
        object_key: string;
        expires_in: number;
        required_headers: Record<string, string>;
      }>
    >(
      `${this.apiBaseUrl}/api/v1/marketplace/products/reviews/media/upload-url`,
      {
        productReviewParam: {
          actionType: 'generateReviewMediaUploadUrl',
          actionData: {
            product_id: productId,
            mime_type: file.type || 'image/jpeg',
            file_size: file.size,
            file_name: file.name,
          },
        },
      },
      { withCredentials: true },
    );
  }

  updateReview(dto: UpdateProductReviewDto): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/reviews/update`,
      {
        productReviewParam: {
          actionType: 'updateProductReview',
          actionData: dto,
        },
      },
      { withCredentials: true },
    );
  }

  deleteReview(reviewId: number): Observable<ApiResponse<{ id: number; deleted: boolean }>> {
    return this.http.post<ApiResponse<{ id: number; deleted: boolean }>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/reviews/delete`,
      {
        productReviewParam: {
          actionType: 'deleteProductReview',
          actionData: { review_id: reviewId },
        },
      },
      { withCredentials: true },
    );
  }

  voteHelpful(
    reviewId: number,
  ): Observable<
    ApiResponse<{ review_id: number; user_voted_helpful: boolean; helpful_count: number }>
  > {
    return this.http.post<
      ApiResponse<{ review_id: number; user_voted_helpful: boolean; helpful_count: number }>
    >(
      `${this.apiBaseUrl}/api/v1/marketplace/products/reviews/vote`,
      {
        productReviewParam: {
          actionType: 'voteProductReviewHelpful',
          actionData: { review_id: reviewId },
        },
      },
      { withCredentials: true },
    );
  }

  reportReview(
    dto: ReportProductReviewDto,
  ): Observable<ApiResponse<{ id: number; report_status: string }>> {
    return this.http.post<ApiResponse<{ id: number; report_status: string }>>(
      `${this.apiBaseUrl}/api/v1/marketplace/products/reviews/report`,
      {
        productReviewParam: {
          actionType: 'reportProductReview',
          actionData: dto,
        },
      },
      { withCredentials: true },
    );
  }
}
