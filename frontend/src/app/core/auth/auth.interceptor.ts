import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, from, map, shareReplay, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { AuthService } from './auth.service';

let refreshInFlight: Observable<string | null> | null = null;

function isAuthFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (error.status === 401) return true;
  if (error.status === 400 && error.error && typeof error.error === 'object') {
    const errorBody = error.error as { msgArr?: unknown };
    const messages = Array.isArray(errorBody.msgArr)
      ? errorBody.msgArr.map((m) => String(m)).join(' ')
      : '';
    if (
      messages.includes('Access token') ||
      messages.includes('token is invalid') ||
      messages.includes('token is required') ||
      messages.includes('token is expired') ||
      messages.includes('expired') ||
      messages.includes('Login session is no longer active')
    ) {
      return true;
    }
  }
  return false;
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const auth = inject(AuthService);

  const isApiRequest = apiBaseUrl
    ? request.url.startsWith(apiBaseUrl)
    : request.url.startsWith('/api/');
  const isPublicAuthRequest = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
  ].some((path) => request.url.endsWith(path));

  if (!isApiRequest || isPublicAuthRequest) {
    return next(request);
  }

  const getRefreshObservable = (): Observable<string | null> => {
    if (!refreshInFlight) {
      refreshInFlight = from(auth.refreshSession()).pipe(
        map((success) => (success ? auth.accessToken() : null)),
        shareReplay(1),
        finalize(() => {
          refreshInFlight = null;
        }),
      );
    }
    return refreshInFlight;
  };

  // Preemptive refresh: if user is authenticated but token is already expired, refresh before sending
  if (auth.isAuthenticated() && auth.isTokenExpired()) {
    return getRefreshObservable().pipe(
      switchMap((newToken) => {
        const req = newToken
          ? request.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
          : request;
        return next(req);
      }),
    );
  }

  const currentToken = auth.accessToken();
  const outgoingRequest = currentToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${currentToken}` } })
    : request;

  return next(outgoingRequest).pipe(
    catchError((error) => {
      if (isAuthFailure(error) && auth.isAuthenticated()) {
        return getRefreshObservable().pipe(
          switchMap((newToken) => {
            if (newToken) {
              return next(request.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
            }
            return throwError(() => error);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
