import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../config/api-base-url';
import { AuthService } from './auth.service';

const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const isApiRequest = apiBaseUrl
    ? request.url === apiBaseUrl || request.url.startsWith(`${apiBaseUrl}/`)
    : request.url.startsWith('/api/');

  if (!isApiRequest) return next(request);

  const requestPath = (() => {
    try {
      return new URL(request.url, 'http://bbg.local').pathname;
    } catch {
      return request.url;
    }
  })();
  const isPublicAuthRequest = PUBLIC_AUTH_PATHS.includes(requestPath);
  const token = inject(AuthService).accessToken();

  if (!token || isPublicAuthRequest) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
