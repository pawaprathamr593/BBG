import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../http/api.service';
import { ApiError } from '../http/api-error';
import { ApiEnvelope } from '../http/api.models';
import { PermissionContext, PermissionService } from '../permissions/permission.service';
import { AuthResponseData, AuthUser, LoginRequest, RegisterRequest } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionHintKey = 'bbg-session-present';
  constructor(
    private readonly api: ApiService,
    private readonly permissionService: PermissionService,
  ) {}

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
    const user = this.acceptAuthResponse(response);
    await this.loadPermissions(0).catch(() => this.permissionService.clear());
    return user;
  }

  async startSocialLogin(provider: 'google' | 'apple' | 'facebook' | 'instagram'): Promise<
    | { status: 'SUCCESS'; user: AuthUser }
    | { status: 'EMAIL_REQUIRED'; ticket: string; email: string | null }
  > {
    if (typeof window === 'undefined') throw new ApiError('Social sign-in is only available in a browser.');
    const base = environment.apiBaseUrl || window.location.origin;
    const apiOrigin = new URL(base, window.location.origin).origin;
    const popupUrl = `${base.replace(/\/$/, '')}/api/v1/auth/oauth/${provider}/start`;
    const popup = window.open(popupUrl, 'bbg-social-sign-in', 'popup=yes,width=520,height=680,resizable=yes,scrollbars=yes');
    if (!popup) throw new ApiError('Your browser blocked the sign-in window. Allow pop-ups for BBG and try again.');

    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = (): void => {
        window.removeEventListener('message', onMessage);
        window.clearTimeout(timeout);
        window.clearInterval(closeCheck);
        if (!popup.closed) popup.close();
      };
      const finish = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      const onMessage = (event: MessageEvent): void => {
        if (event.origin !== apiOrigin || event.source !== popup || !event.data || typeof event.data !== 'object') return;
        if (event.data.type === 'BBG_OAUTH_EMAIL_REQUIRED') {
          finish(() => resolve({
            status: 'EMAIL_REQUIRED',
            ticket: String(event.data.ticket ?? ''),
            email: typeof event.data.email === 'string' ? event.data.email : null,
          }));
          return;
        }
        if (event.data.type === 'BBG_OAUTH_SUCCESS') {
          void (async () => {
            try {
              const user = this.acceptAuthResponse(event.data.payload as ApiEnvelope<AuthResponseData>);
              await this.loadPermissions(0).catch(() => this.permissionService.clear());
              finish(() => resolve({ status: 'SUCCESS', user }));
            } catch (error) {
              finish(() => reject(error));
            }
          })();
          return;
        }
        if (event.data.type === 'BBG_OAUTH_ERROR') {
          finish(() => reject(new ApiError(String(event.data.message ?? 'Social sign-in failed.'))));
        }
      };
      window.addEventListener('message', onMessage);
      const timeout = window.setTimeout(() => finish(() => reject(new ApiError('Social sign-in timed out. Please try again.'))), 120000);
      const closeCheck = window.setInterval(() => {
        if (popup.closed) finish(() => reject(new ApiError('The social sign-in window was closed before completion.')));
      }, 500);
    });
  }

  async requestSocialEmailOtp(ticket: string, email: string): Promise<{ email: string; expires_in: number; resend_after: number }> {
    const response = await firstValueFrom(this.api.post<{ email: string; expires_in: number; resend_after: number }>(
      '/api/v1/auth/oauth/email/send',
      { ticket, email },
      { withCredentials: true },
    ));
    this.assertSuccess(response, 'Unable to send the verification code.');
    if (!response.data || Array.isArray(response.data)) throw new ApiError('The verification response was incomplete.');
    return response.data;
  }

  async verifySocialEmailOtp(ticket: string, email: string, code: string): Promise<AuthUser> {
    const response = await firstValueFrom(this.api.post<AuthResponseData>(
      '/api/v1/auth/oauth/email/verify',
      { ticket, email, code },
      { withCredentials: true },
    ));
    const user = this.acceptAuthResponse(response);
    await this.loadPermissions(0).catch(() => this.permissionService.clear());
    return user;
  }

  async refreshSession(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.api.post<AuthResponseData>(
        '/api/v1/auth/refresh',
        { authParam: { actionType: 'manageAuth', actionData: { action: 'refresh' } } },
        { withCredentials: true, headers: { 'X-BBG-CSRF': '1' } },
      ));
      this.acceptAuthResponse(response);
      await this.loadPermissions(0).catch(() => this.permissionService.clear());
      return true;
    } catch {
      this.clearLocalSession();
      return false;
    }
  }

  async restoreSession(): Promise<boolean> {
    if (this.accessTokenState()) return true;
    // Avoid a guaranteed 400 refresh request for visitors who have never signed in.
    // This flag is only a non-secret hint; the HttpOnly refresh cookie remains authoritative.
    if (!this.hasSessionHint()) return false;
    return this.refreshSession();
  }

  async loadPermissions(tenantId = 0): Promise<PermissionContext> {
    const token = this.accessTokenState();
    if (!token) throw new ApiError('Sign in before loading permissions.');

    const response = await firstValueFrom(this.api.post<PermissionContext>(
      '/api/v1/auth/permissions',
      { authParam: { actionType: 'getAuth', actionData: { tenant_id: tenantId } } },
      { headers: { Authorization: `Bearer ${token}` } },
    ));
    this.assertSuccess(response, 'Unable to load permissions.');
    if (!response.data || Array.isArray(response.data)) {
      throw new ApiError('The permissions response did not contain a context record.');
    }
    this.permissionService.replaceFromVerifiedResponse(response.data);
    return response.data;
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
    this.setSessionHint(true);
    this.user.set(data.user);
    this.isAuthenticated.set(true);
    return data.user;
  }

  private assertSuccess<T>(response: ApiEnvelope<T>, fallback: string): void {
    if (response.status !== 'SUCCESS') {
      throw new ApiError(response.msgArr?.join(' ') || fallback, null, response.msgArr ?? []);
    }
  }

  private hasSessionHint(): boolean {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(this.sessionHintKey) === '1'; }
    catch { return true; }
  }

  private setSessionHint(active: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      if (active) window.localStorage.setItem(this.sessionHintKey, '1');
      else window.localStorage.removeItem(this.sessionHintKey);
    } catch { /* The HttpOnly cookie remains authoritative if storage is unavailable. */ }
  }

  private clearLocalSession(): void {
    this.setSessionHint(false);
    this.accessTokenState.set(null);
    this.user.set(null);
    this.isAuthenticated.set(false);
    this.permissionService.clear();
  }
}
