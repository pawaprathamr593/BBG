import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-promotion-composer-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './promotion-composer-module.html',
  styleUrl: './promotion-composer-module.scss',
})
export class PromotionComposerModule {
  readonly title = input('');
  readonly content = input('');
  readonly validUntil = input('');
  readonly files = input<File[]>([]);
  readonly busy = input(false);
  readonly progress = input(0);
  readonly error = input('');
  readonly canSubmit = input(false);

  readonly titleInput = output<Event>();
  readonly contentInput = output<Event>();
  readonly validUntilInput = output<Event>();
  readonly filesSelected = output<Event>();
  readonly filesDropped = output<DragEvent>();
  readonly fileRemoved = output<number>();
  readonly cancel = output<void>();
  readonly submit = output<void>();

  mediaLabel(mime: string): string {
    return mime.startsWith('image/') ? 'IMAGE' : mime.startsWith('video/') ? 'VIDEO'
      : mime.startsWith('audio/') ? 'AUDIO' : mime === 'application/pdf' ? 'PDF' : 'DOC';
  }

  fileSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
