import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../config/api-base-url';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const isApiRequest = apiBaseUrl
    ? request.url.startsWith(apiBaseUrl)
    : request.url.startsWith('/api/');
  const isPublicAuthRequest = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh']
    .some((path) => request.url.endsWith(path));
  const token = inject(AuthService).accessToken();

  if (!isApiRequest || !token || isPublicAuthRequest) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
