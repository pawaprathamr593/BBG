import { HttpClient, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { filter, lastValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class S3UploadService {
  private readonly http = inject(HttpClient);

  async upload(
    uploadUrl: string,
    file: File,
    headers: Record<string, string>,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    await lastValueFrom(this.http.put(this.resolveUploadUrl(uploadUrl), file, {
      headers: new HttpHeaders(headers),
      observe: 'events',
      reportProgress: true,
      responseType: 'text',
    }).pipe(
      tap((event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      }),
      filter((event): event is HttpResponse<string> => event.type === HttpEventType.Response),
    ));
  }

  private resolveUploadUrl(uploadUrl: string): string {
    if (environment.production) {
      return uploadUrl;
    }

    let s3Url: URL;
    try {
      s3Url = new URL(uploadUrl);
    } catch {
      throw new Error('The S3 upload URL is invalid.');
    }

    if (s3Url.protocol !== 'https:' || s3Url.hostname !== environment.s3UploadHost) {
      throw new Error('The S3 upload URL does not match the configured local development proxy.');
    }

    return `/s3-upload${s3Url.pathname}${s3Url.search}`;
  }
}
