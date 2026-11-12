export interface AuthUser {
  user_id: number;
  full_name: string;
  email: string | null;
  mobile: string | null;
  profile_image?: string | null;
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
