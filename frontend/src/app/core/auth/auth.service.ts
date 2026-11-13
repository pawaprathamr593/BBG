import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../http/api.service';
import { ApiError } from '../http/api-error';
import { ApiEnvelope } from '../http/api.models';
import { AuthResponseData, AuthUser, LoginRequest, RegisterRequest } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly accessTokenState = signal<string | null>(null);
  readonly accessToken = this.accessTokenState.asReadonly();
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = signal(false);

  async register(payload: RegisterRequest): Promise<AuthUser> {
    const registration = await firstValueFrom(this.api.post<unknown>(
      '/api/v1/auth/register',
      { authParam: { actionType: 'manageAuth', actionData: { action: 'register', ...payload } } },
      { withCredentials: true },
    ));
    this.assertSuccess(registration, 'Registration failed.');

    const identifier = payload.email?.trim() || payload.mobile?.trim() || '';
    return this.login({ identifier, password: payload.password });
  }

  async login(payload: LoginRequest): Promise<AuthUser> {
    const response = await firstValueFrom(this.api.post<AuthResponseData>(
      '/api/v1/auth/login',
      { authParam: { actionType: 'manageAuth', actionData: { action: 'login', ...payload } } },
      { withCredentials: true },
    ));
    return this.acceptAuthResponse(response);
  }

  async refreshSession(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.api.post<AuthResponseData>(
        '/api/v1/auth/refresh',
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
    const response = await firstValueFrom(this.api.post<AuthUser>(
      '/api/v1/auth/profile',
      { authParam: { actionType: 'getAuth', actionData: { action: 'getProfile' } } },
      { headers: { Authorization: `Bearer ${this.accessTokenState() ?? ''}` } },
    ));
    this.assertSuccess(response, 'Unable to load profile.');
    if (!response.data || Array.isArray(response.data)) {
      throw new ApiError('The profile response did not contain a user record.');
    }
    this.user.set(response.data);
    this.isAuthenticated.set(true);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<unknown>(
        '/api/v1/auth/logout',
        { authParam: { actionType: 'manageAuth', actionData: { action: 'logout' } } },
        { withCredentials: true, headers: { 'X-BBG-CSRF': '1' } },
      ));
    } finally {
      this.clearLocalSession();
    }
  }

  errorMessage(error: unknown): string {
    if (error instanceof ApiError) return error.message;
    return error instanceof Error ? error.message : 'The request could not be completed.';
  }

  private acceptAuthResponse(response: ApiEnvelope<AuthResponseData>): AuthUser {
    this.assertSuccess(response, 'Authentication failed.');
    if (!response.data || Array.isArray(response.data)) {
      throw new ApiError('The authentication response did not contain a user record.');
    }
    const data = response.data;
    this.accessTokenState.set(data.access_token);
    this.user.set(data.user);
    this.isAuthenticated.set(true);
    return data.user;
  }

  private assertSuccess<T>(response: ApiEnvelope<T>, fallback: string): void {
    if (response.status !== 'SUCCESS') {
      throw new ApiError(response.msgArr?.join(' ') || fallback, null, response.msgArr ?? []);
    }
  }

  private clearLocalSession(): void {
    this.accessTokenState.set(null);
    this.user.set(null);
    this.isAuthenticated.set(false);
  }
}
