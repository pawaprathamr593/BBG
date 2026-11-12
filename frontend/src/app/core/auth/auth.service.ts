import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import { ApiResponse, AuthResponseData, AuthUser, LoginRequest, RegisterRequest } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly accessTokenState = signal<string | null>(null);
  readonly accessToken = this.accessTokenState.asReadonly();
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = signal(false);

  async register(payload: RegisterRequest): Promise<AuthUser> {
    const registration = await firstValueFrom(this.http.post<ApiResponse<unknown>>(
      `${this.apiBaseUrl}/api/v1/auth/register`,
      { authParam: { actionType: 'manageAuth', actionData: { action: 'register', ...payload } } },
      { withCredentials: true },
    ));
    if (registration.status !== 'SUCCESS') {
      throw new Error(registration.msgArr?.join(' ') || 'Registration failed.');
    }
    const identifier = payload.email?.trim() || payload.mobile?.trim() || '';
    return this.login({ identifier, password: payload.password });
  }

  async login(payload: LoginRequest): Promise<AuthUser> {
    const response = await firstValueFrom(this.http.post<ApiResponse<AuthResponseData>>(
      `${this.apiBaseUrl}/api/v1/auth/login`,
      { authParam: { actionType: 'manageAuth', actionData: { action: 'login', ...payload } } },
      { withCredentials: true },
    ));
    return this.acceptAuthResponse(response);
  }

  async refreshSession(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.http.post<ApiResponse<AuthResponseData>>(
        `${this.apiBaseUrl}/api/v1/auth/refresh`,
        { authParam: { actionType: 'manageAuth', actionData: { action: 'refresh' } } },
        { withCredentials: true, headers: { 'X-BBG-CSRF': '1' } },
      ));
      this.acceptAuthResponse(response);
      return true;
    } catch {
      this.clearLocalSession();
      return false;
    }
  }

  async restoreSession(): Promise<boolean> {
    if (this.accessTokenState()) return true;
    return this.refreshSession();
  }

  async loadProfile(): Promise<AuthUser> {
    const response = await firstValueFrom(this.http.post<ApiResponse<AuthUser>>(
      `${this.apiBaseUrl}/api/v1/auth/profile`,
      { authParam: { actionType: 'getAuth', actionData: { action: 'getProfile' } } },
      { headers: { Authorization: `Bearer ${this.accessTokenState() ?? ''}` } },
    ));
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load profile.');
    }
    this.user.set(response.data as AuthUser);
    this.isAuthenticated.set(true);
    return response.data as AuthUser;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<ApiResponse<unknown>>(
        `${this.apiBaseUrl}/api/v1/auth/logout`,
        { authParam: { actionType: 'manageAuth', actionData: { action: 'logout' } } },
        { withCredentials: true, headers: { 'X-BBG-CSRF': '1' } },
      ));
    } finally {
      this.clearLocalSession();
    }
  }

  private acceptAuthResponse(response: ApiResponse<AuthResponseData>): AuthUser {
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Authentication failed.');
    }
    const data = response.data as AuthResponseData;
    this.accessTokenState.set(data.access_token);
    this.user.set(data.user);
    this.isAuthenticated.set(true);
    return data.user;
  }

  errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as Partial<ApiResponse<unknown>> | null;
      if (Array.isArray(body?.msgArr) && body.msgArr.length) return body.msgArr.join(' ');
    }
    return error instanceof Error ? error.message : 'The request could not be completed.';
  }

  private clearLocalSession(): void {
    this.accessTokenState.set(null);
    this.user.set(null);
    this.isAuthenticated.set(false);
  }
}
