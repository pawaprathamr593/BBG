import { HttpErrorResponse } from '@angular/common/http';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number | null = null,
    readonly messages: readonly string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    if (error instanceof HttpErrorResponse) {
      const body = error.error as { msgArr?: unknown } | null;
      const messages = Array.isArray(body?.msgArr)
        ? body.msgArr.filter((item): item is string => typeof item === 'string')
        : [];
      const fallback = error.status === 0
        ? 'Unable to reach BBG. Check your connection and try again.'
        : 'The request could not be completed.';
      return new ApiError(messages.join(' ') || fallback, error.status, messages);
    }

    if (error instanceof Error) return new ApiError(error.message);
    return new ApiError('The request could not be completed.');
  }
}
