import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, effect, inject, input, output } from '@angular/core';

@Component({
  selector: 'app-workspace-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-drawer.html',
  styleUrl: './workspace-drawer.scss',
})
export class WorkspaceDrawer {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input('');
  readonly closed = output<void>();

  private readonly document = inject(DOCUMENT);
  private readonly element = inject(ElementRef<HTMLElement>);
  private previousOverflow = '';
  private previousFocus: HTMLElement | null = null;
  private wasOpen = false;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen && !this.wasOpen) {
        this.previousFocus = this.document.activeElement instanceof HTMLElement
          ? this.document.activeElement
          : null;
        this.previousOverflow = this.document.body.style.overflow;
        this.document.body.style.overflow = 'hidden';
        queueMicrotask(() => this.focusInitialControl());
      } else if (!isOpen && this.wasOpen) {
        this.document.body.style.overflow = this.previousOverflow;
        this.previousFocus?.focus();
        this.previousFocus = null;
      }
      this.wasOpen = isOpen;
    });
  }

  requestClose(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = this.focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      this.element.nativeElement.querySelector<HTMLElement>('.workspace-drawer')?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusInitialControl(): void {
    if (!this.open()) return;
    const first = this.focusableElements()[0];
    (first ?? this.element.nativeElement.querySelector<HTMLElement>('.workspace-drawer'))?.focus();
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>(
      '.workspace-drawer button:not([disabled]), .workspace-drawer input:not([disabled]), .workspace-drawer select:not([disabled]), .workspace-drawer textarea:not([disabled]), .workspace-drawer a[href], .workspace-drawer [tabindex="0"]',
    )).filter((element) => element.getAttribute('aria-hidden') !== 'true');
  }
}
