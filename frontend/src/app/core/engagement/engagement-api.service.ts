import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiResponse } from '../auth/auth.models';
import {
  CommentListResponse,
  ContentComment,
  ContentEngagementSummary,
  CreateCommentDto,
  DeleteCommentDto,
  ReportContentDto,
  ToggleReactionDto,
  UpdateCommentDto,
} from './engagement.models';

@Injectable({ providedIn: 'root' })
export class EngagementApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getComments(
    contentType: 'POST' | 'PRODUCT' | 'BUSINESS',
    contentId: number,
    page: number = 1,
    pageSize: number = 20,
  ): Observable<ApiResponse<CommentListResponse>> {
    return this.http.post<ApiResponse<CommentListResponse>>(
      `${this.apiBaseUrl}/api/v1/engagement/comments/list`,
      {
        engagementParam: {
          actionType: 'listContentComments',
          actionData: {
            content_type: contentType,
            content_id: contentId,
            page,
            page_size: pageSize,
          },
        },
      },
      { withCredentials: true },
    );
  }

  getEngagementSummary(
    contentType: 'POST' | 'PRODUCT' | 'BUSINESS',
    contentId: number,
  ): Observable<ApiResponse<ContentEngagementSummary>> {
    return this.http.post<ApiResponse<ContentEngagementSummary>>(
      `${this.apiBaseUrl}/api/v1/engagement/summary`,
      {
        engagementParam: {
          actionType: 'getEngagementSummary',
          actionData: {
            content_type: contentType,
            content_id: contentId,
          },
        },
      },
      { withCredentials: true },
    );
  }

  toggleReaction(dto: ToggleReactionDto): Observable<ApiResponse<ContentEngagementSummary>> {
    return this.http.post<ApiResponse<ContentEngagementSummary>>(
      `${this.apiBaseUrl}/api/v1/engagement/likes/toggle`,
      {
        engagementParam: {
          actionType: 'toggleContentLike',
          actionData: {
            content_type: dto.content_type,
            content_id: dto.content_id,
            reaction_type: dto.reaction_type ?? 'LIKE',
          },
        },
      },
      { withCredentials: true },
    );
  }

  createComment(dto: CreateCommentDto): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(
      `${this.apiBaseUrl}/api/v1/engagement/comments/create`,
      {
        engagementParam: {
          actionType: 'createContentComment',
          actionData: dto,
        },
      },
      { withCredentials: true },
    );
  }

  updateComment(dto: UpdateCommentDto): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(
      `${this.apiBaseUrl}/api/v1/engagement/comments/update`,
      {
        engagementParam: {
          actionType: 'updateContentComment',
          actionData: dto,
        },
      },
      { withCredentials: true },
    );
  }

  deleteComment(dto: DeleteCommentDto): Observable<ApiResponse<{ id: number; deleted: boolean }>> {
    return this.http.post<ApiResponse<{ id: number; deleted: boolean }>>(
      `${this.apiBaseUrl}/api/v1/engagement/comments/delete`,
      {
        engagementParam: {
          actionType: 'deleteContentComment',
          actionData: dto,
        },
      },
      { withCredentials: true },
    );
  }

  reportContent(dto: ReportContentDto): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(
      `${this.apiBaseUrl}/api/v1/engagement/reports/create`,
      {
        engagementParam: {
          actionType: 'reportContent',
          actionData: dto,
        },
      },
      { withCredentials: true },
    );
  }

  recordView(
    contentType: 'POST' | 'PRODUCT' | 'BUSINESS',
    contentId: number,
    visitorKey?: string,
  ): Observable<ApiResponse<{ recorded: boolean }>> {
    return this.http.post<ApiResponse<{ recorded: boolean }>>(
      `${this.apiBaseUrl}/api/v1/engagement/views/record`,
      {
        engagementParam: {
          actionType: 'recordContentView',
          actionData: {
            content_type: contentType,
            content_id: contentId,
            ...(visitorKey ? { visitor_key: visitorKey } : {}),
          },
        },
      },
      { withCredentials: true },
    );
  }
}
