import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-promotion-composer-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './promotion-composer-module.html',
  styleUrl: './promotion-composer-module.scss',
})
export class PromotionComposerModule {
  readonly isEditing = input(false);
  readonly title = input('');
  readonly content = input('');
  readonly validUntil = input('');
  readonly files = input<File[]>([]);
  readonly previews = input<Map<File, string>>(new Map());
  readonly existingMedia = input<any[]>([]);
  readonly stagedPrimaryIndex = input<number>(0);
  readonly busy = input(false);
  readonly progress = input(0);
  readonly error = input('');
  readonly canSubmit = input(false);

  readonly titleInput = output<Event>();
  readonly contentInput = output<Event>();
  readonly validUntilInput = output<Event>();
  readonly filesSelected = output<Event>();
  readonly dragOver = output<DragEvent>();
  readonly filesDropped = output<DragEvent>();
  readonly fileRemoved = output<number>();
  readonly existingMediaRemoved = output<any>();
  readonly existingMediaPrimary = output<any>();
  readonly stagedPrimaryChanged = output<number>();
  readonly cancel = output<void>();
  readonly submit = output<void>();

  mediaLabel(mime: string): string {
    return mime.startsWith('image/')
      ? 'IMAGE'
      : mime.startsWith('video/')
        ? 'VIDEO'
        : mime.startsWith('audio/')
          ? 'AUDIO'
          : mime === 'application/pdf'
            ? 'PDF'
            : 'DOC';
  }

  fileSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  isImage(urlOrPath?: string): boolean {
    if (!urlOrPath) return false;
    const clean = urlOrPath.split('?')[0].toLowerCase();
    return (
      clean.endsWith('.jpg') ||
      clean.endsWith('.jpeg') ||
      clean.endsWith('.png') ||
      clean.endsWith('.webp') ||
      clean.endsWith('.gif')
    );
  }

  isVideo(urlOrPath?: string): boolean {
    if (!urlOrPath) return false;
    const clean = urlOrPath.split('?')[0].toLowerCase();
    return clean.endsWith('.mp4') || clean.endsWith('.webm');
  }

  isAudio(urlOrPath?: string): boolean {
    if (!urlOrPath) return false;
    const clean = urlOrPath.split('?')[0].toLowerCase();
    return clean.endsWith('.mp3') || clean.endsWith('.wav') || clean.endsWith('.ogg');
  }

  getFileName(path?: string): string {
    if (!path) return 'Media file';
    const clean = path.split('?')[0];
    const parts = clean.split('/');
    return parts[parts.length - 1] || 'Media file';
  }
}
