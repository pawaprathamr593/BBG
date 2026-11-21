import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url';
import {
  ApiResponse,
  AuthResponseData,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  SocialAuthConfig,
  SocialAuthIntent,
  SocialProvider,
} from './auth.models';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityApi {
  initialize(config: {
    client_id: string;
    nonce: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  prompt(
    callback?: (notification: {
      isNotDisplayed?: () => boolean;
      isSkippedMoment?: () => boolean;
    }) => void,
  ): void;
}

interface FacebookAuthResponse {
  authResponse?: { accessToken: string; userID: string } | null;
}

interface FacebookSdk {
  init(config: { appId: string; version: string; xfbml: boolean }): void;
  login(callback: (response: FacebookAuthResponse) => void, options: { scope: string }): void;
}

interface AppleAuthResponse {
  authorization?: { id_token?: string; code?: string; state?: string };
  user?: { name?: { firstName?: string; lastName?: string } };
}

interface AppleSdk {
  auth: {
    init(config: {
      clientId: string;
      scope: string;
      redirectURI: string;
      state: string;
      nonce: string;
      usePopup: boolean;
    }): void;
    signIn(): Promise<AppleAuthResponse>;
  };
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityApi } };
    FB?: FacebookSdk;
    AppleID?: AppleSdk;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly accessTokenState = signal<string | null>(null);
  private readonly socialConfigState = signal<SocialAuthConfig | null>(null);
  readonly accessToken = this.accessTokenState.asReadonly();
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = signal(false);
  readonly socialConfig = this.socialConfigState.asReadonly();

  async register(payload: RegisterRequest): Promise<AuthUser> {
    const registration = await firstValueFrom(
      this.http.post<ApiResponse<unknown>>(
        `${this.apiBaseUrl}/api/v1/auth/register`,
        { authParam: { actionType: 'manageAuth', actionData: { action: 'register', ...payload } } },
        { withCredentials: true },
      ),
    );
    if (registration.status !== 'SUCCESS') {
      throw new Error(registration.msgArr?.join(' ') || 'Registration failed.');
    }
    const identifier = payload.email?.trim() || payload.mobile?.trim() || '';
    return this.login({ identifier, password: payload.password });
  }

  async login(payload: LoginRequest): Promise<AuthUser> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<AuthResponseData>>(
        `${this.apiBaseUrl}/api/v1/auth/login`,
        { authParam: { actionType: 'manageAuth', actionData: { action: 'login', ...payload } } },
        { withCredentials: true },
      ),
    );
    return this.acceptAuthResponse(response);
  }

  async loadSocialConfig(): Promise<SocialAuthConfig> {
    const response = await firstValueFrom(
      this.http.get<ApiResponse<SocialAuthConfig>>(`${this.apiBaseUrl}/api/v1/auth/social/config`),
    );
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Social sign-in options could not be loaded.');
    }
    const config = response.data as SocialAuthConfig;
    this.socialConfigState.set(config);
    return config;
  }

  async authenticateSocial(
    provider: SocialProvider,
    intent: SocialAuthIntent,
    contact: { email?: string; mobile?: string; full_name?: string } = {},
  ): Promise<AuthUser> {
    const config = this.socialConfigState() ?? (await this.loadSocialConfig());
    const providerConfig = config.providers?.[provider];
    if (!providerConfig?.enabled) {
      throw new Error(`${this.providerLabel(provider)} sign-in is not configured yet.`);
    }

    switch (provider) {
      case 'GOOGLE':
        return this.authenticateGoogle(providerConfig.client_id ?? '', intent, contact);
      case 'FACEBOOK':
        return this.authenticateFacebook(providerConfig.app_id ?? '', intent, contact);
      case 'APPLE':
        return this.authenticateApple(providerConfig.client_id ?? '', intent, contact);
      case 'INSTAGRAM':
        return new Promise<AuthUser>(() =>
          this.startInstagramLogin(providerConfig.app_id ?? '', intent, contact),
        );
    }
  }

  async completeInstagramLogin(code: string, returnedState: string): Promise<AuthUser> {
    const expectedState = sessionStorage.getItem('bbg_instagram_state') ?? '';
    const intent = (sessionStorage.getItem('bbg_instagram_intent') ?? 'login') as SocialAuthIntent;
    const fullName = sessionStorage.getItem('bbg_instagram_full_name') ?? '';
    const email = sessionStorage.getItem('bbg_instagram_email') ?? '';
    const mobile = sessionStorage.getItem('bbg_instagram_mobile') ?? '';
    sessionStorage.removeItem('bbg_instagram_state');
    sessionStorage.removeItem('bbg_instagram_intent');
    sessionStorage.removeItem('bbg_instagram_full_name');
    sessionStorage.removeItem('bbg_instagram_email');
    sessionStorage.removeItem('bbg_instagram_mobile');
    if (!expectedState || !returnedState || expectedState !== returnedState) {
      throw new Error('Instagram sign-in could not be verified. Please start again.');
    }
    const redirectUri = `${window.location.origin}/auth/social/callback`;
    return this.completeSocialCredential('INSTAGRAM', code, intent, {
      redirect_uri: redirectUri,
      full_name: fullName,
      email,
      mobile,
    });
  }

  async linkSocialProvider(
    provider: SocialProvider,
    credential: string,
    context: Record<string, string> = {},
  ): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<unknown>>(
        `${this.apiBaseUrl}/api/v1/auth/social/link`,
        {
          authParam: {
            actionType: 'manageAuth',
            actionData: { action: 'socialLink', provider, credential, ...context },
          },
        },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${this.accessTokenState() ?? ''}`, 'X-BBG-CSRF': '1' },
        },
      ),
    );
    if (response.status !== 'SUCCESS') {
      throw new Error(response.msgArr?.join(' ') || 'The provider could not be linked.');
    }
  }

  async refreshSession(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<AuthResponseData>>(
          `${this.apiBaseUrl}/api/v1/auth/refresh`,
          { authParam: { actionType: 'manageAuth', actionData: { action: 'refresh' } } },
          { withCredentials: true, headers: { 'X-BBG-CSRF': '1' } },
        ),
      );
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
    const response = await firstValueFrom(
      this.http.post<ApiResponse<AuthUser>>(
        `${this.apiBaseUrl}/api/v1/auth/profile`,
        { authParam: { actionType: 'getAuth', actionData: { action: 'getProfile' } } },
        { headers: { Authorization: `Bearer ${this.accessTokenState() ?? ''}` } },
      ),
    );
    if (response.status !== 'SUCCESS' || !response.data || Array.isArray(response.data)) {
      throw new Error(response.msgArr?.join(' ') || 'Unable to load profile.');
    }
    this.user.set(response.data as AuthUser);
    this.isAuthenticated.set(true);
    return response.data as AuthUser;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<ApiResponse<unknown>>(
          `${this.apiBaseUrl}/api/v1/auth/logout`,
          { authParam: { actionType: 'manageAuth', actionData: { action: 'logout' } } },
          { withCredentials: true, headers: { 'X-BBG-CSRF': '1' } },
        ),
      );
    } finally {
      this.clearLocalSession();
    }
  }

  private async authenticateGoogle(
    clientId: string,
    intent: SocialAuthIntent,
    contact: { email?: string; mobile?: string; full_name?: string },
  ): Promise<AuthUser> {
    await this.loadScript('https://accounts.google.com/gsi/client');
    const google = window.google?.accounts?.id;
    if (!google) throw new Error('Google sign-in could not be initialized. Please try again.');
    const nonce = this.createNonce();

    return new Promise<AuthUser>((resolve, reject) => {
      let completed = false;
      const timeout = window.setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error('Google sign-in timed out. Please try again.'));
        }
      }, 60000);
      google.initialize({
        client_id: clientId,
        nonce,
        callback: async (credentialResponse) => {
          completed = true;
          window.clearTimeout(timeout);
          try {
            resolve(
              await this.completeSocialCredential('GOOGLE', credentialResponse.credential, intent, {
                nonce,
                ...contact,
              }),
            );
          } catch (error) {
            reject(error);
          }
        },
      });
      google.prompt((notification) => {
        if (!completed && (notification.isNotDisplayed?.() || notification.isSkippedMoment?.())) {
          completed = true;
          window.clearTimeout(timeout);
          reject(new Error('Google sign-in was not completed. Please try again.'));
        }
      });
    });
  }

  private async authenticateFacebook(
    appId: string,
    intent: SocialAuthIntent,
    contact: { email?: string; mobile?: string; full_name?: string },
  ): Promise<AuthUser> {
    await this.loadScript('https://connect.facebook.net/en_US/sdk.js');
    const facebook = window.FB;
    if (!facebook) throw new Error('Facebook sign-in could not be initialized. Please try again.');
    facebook.init({ appId, version: 'v27.0', xfbml: false });

    return new Promise<AuthUser>((resolve, reject) => {
      facebook.login(
        async (result) => {
          const token = result.authResponse?.accessToken;
          if (!token) {
            reject(new Error('Facebook sign-in was cancelled or did not return a token.'));
            return;
          }
          try {
            resolve(await this.completeSocialCredential('FACEBOOK', token, intent, contact));
          } catch (error) {
            reject(error);
          }
        },
        { scope: 'email,public_profile' },
      );
    });
  }

  private async authenticateApple(
    clientId: string,
    intent: SocialAuthIntent,
    contact: { email?: string; mobile?: string; full_name?: string },
  ): Promise<AuthUser> {
    await this.loadScript(
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
    );
    const apple = window.AppleID;
    if (!apple) throw new Error('Apple sign-in could not be initialized. Please try again.');
    const nonce = this.createNonce();
    const state = this.createNonce();
    apple.auth.init({
      clientId,
      scope: 'name email',
      redirectURI: `${window.location.origin}/auth/social/callback`,
      state,
      nonce,
      usePopup: true,
    });
    const result = await apple.auth.signIn();
    const authorizationCode = result.authorization?.code;
    if (!authorizationCode || result.authorization?.state !== state)
      throw new Error('Apple sign-in could not be verified. Please try again.');
    const fullName = [result.user?.name?.firstName, result.user?.name?.lastName]
      .filter(Boolean)
      .join(' ');
    const redirectUri = `${window.location.origin}/auth/social/callback`;
    return this.completeSocialCredential('APPLE', authorizationCode, intent, {
      ...contact,
      nonce,
      full_name: fullName || contact.full_name || '',
      redirect_uri: redirectUri,
    });
  }

  private startInstagramLogin(
    appId: string,
    intent: SocialAuthIntent,
    contact: { email?: string; mobile?: string; full_name?: string },
  ): void {
    const state = this.createNonce();
    const redirectUri = `${window.location.origin}/auth/social/callback`;
    sessionStorage.setItem('bbg_instagram_state', state);
    sessionStorage.setItem('bbg_instagram_intent', intent);
    sessionStorage.setItem('bbg_instagram_full_name', contact.full_name?.trim() ?? '');
    sessionStorage.setItem('bbg_instagram_email', contact.email?.trim() ?? '');
    sessionStorage.setItem('bbg_instagram_mobile', contact.mobile?.trim() ?? '');
    const url = new URL('https://www.instagram.com/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'instagram_business_basic',
      state,
    }).toString();
    window.location.assign(url.toString());
  }

  private async completeSocialCredential(
    provider: SocialProvider,
    credential: string,
    intent: SocialAuthIntent,
    context: Record<string, string> = {},
  ): Promise<AuthUser> {
    const response = await firstValueFrom(
      this.http.post<ApiResponse<AuthResponseData>>(
        `${this.apiBaseUrl}/api/v1/auth/social/login`,
        {
          authParam: {
            actionType: 'manageAuth',
            actionData: { action: 'socialLogin', provider, credential, intent, ...context },
          },
        },
        { withCredentials: true },
      ),
    );
    return this.acceptAuthResponse(response);
  }

  private loadScript(src: string): Promise<void> {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset['loaded'] === 'true') return Promise.resolve();
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('The sign-in provider script could not be loaded.')),
          { once: true },
        );
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.dataset['loaded'] = 'true';
        resolve();
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('The sign-in provider script could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }

  private createNonce(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private providerLabel(provider: SocialProvider): string {
    return provider.charAt(0) + provider.slice(1).toLowerCase();
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
