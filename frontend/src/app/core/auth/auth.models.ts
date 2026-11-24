export interface AuthUser {
  user_id: number;
  full_name: string;
  email: string | null;
  mobile: string | null;
  profile_image?: string | null;
  has_password?: boolean;
  email_verified?: boolean;
  mobile_verified?: boolean;
  email_verified_on?: string | null;
  mobile_verified_on?: string | null;
  last_login_on?: string | null;
  account_status?: string;
  created_on?: string | null;
}

export interface AuthResponseData {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: AuthUser;
}

export interface ApiResponse<T> {
  status: 'SUCCESS' | 'FAILED' | 'EXCEPTION';
  msgArr: string[];
  data: T | [];
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email?: string;
  mobile?: string;
  password: string;
}

export type SocialProvider = 'GOOGLE' | 'FACEBOOK' | 'INSTAGRAM' | 'APPLE';
export type SocialAuthIntent = 'login' | 'register';

export interface SocialProviderConfig {
  enabled: boolean;
  client_id?: string;
  app_id?: string;
}

export interface SocialAuthConfig {
  providers: Record<SocialProvider, SocialProviderConfig>;
}

export interface UserSession {
  id: number;
  device_name: string;
  browser: string;
  os: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  ip_address: string | null;
  is_internal_ip: boolean;
  issued_on: string;
  last_used_on: string | null;
  expires_on: string;
  is_current: boolean;
}

export interface ActiveSessionsResponse {
  sessions: UserSession[];
  total_count: number;
}
