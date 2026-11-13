export type ApiStatus = 'SUCCESS' | 'FAILED' | 'EXCEPTION';

export interface ApiEnvelope<T> {
  status: ApiStatus;
  msgArr: string[];
  data: T | [];
}

export interface ApiRequestOptions {
  withCredentials?: boolean;
  headers?: Record<string, string>;
}
