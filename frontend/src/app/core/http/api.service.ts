import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiError } from './api-error';
import { ApiEnvelope, ApiRequestOptions } from './api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly baseUrl: string,
  ) {}

  post<TResponse>(
    path: string,
    body: unknown,
    options: ApiRequestOptions = {},
  ): Observable<ApiEnvelope<TResponse>> {
    const headers = new HttpHeaders(options.headers ?? {});
    return this.http
      .post<ApiEnvelope<TResponse>>(this.resolveUrl(path), body, {
        headers,
        withCredentials: options.withCredentials ?? false,
      })
      .pipe(catchError((error: unknown) => throwError(() => ApiError.from(error))));
  }

  private resolveUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return this.baseUrl ? `${this.baseUrl}${normalizedPath}` : normalizedPath;
  }
}
