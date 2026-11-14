import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  template: `
    <button
      #trigger
      class="filter-fab"
      type="button"
      [attr.aria-expanded]="open"
      aria-haspopup="dialog"
      aria-controls="bbg-filter-drawer"
      aria-label="Open advanced filters"
      (click)="openChange.emit(true)">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M7 12h10m-7 6h4" />
        <circle cx="8" cy="6" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="12" cy="18" r="1.5" />
      </svg>
      <span>Filters</span>
      @if (activeCount > 0) {
        <span class="filter-count" aria-label="{{ activeCount }} active filters">{{ activeCount }}</span>
      }
    </button>

    @if (open) {
      <div class="filter-backdrop" aria-hidden="true" (click)="close()"></div>
      <section
        #drawer
        id="bbg-filter-drawer"
        class="filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bbg-filter-title">
        <header class="drawer-header">
          <div>
            <p class="drawer-eyebrow">REFINE RESULTS</p>
            <h2 id="bbg-filter-title">Filters</h2>
          </div>
          <button class="drawer-close" type="button" aria-label="Close filters" data-autofocus (click)="close()">×</button>
        </header>
        <div class="drawer-body">
          <ng-content />
        </div>
        <footer class="drawer-footer">
          <button class="drawer-reset" type="button" (click)="reset.emit()">Reset</button>
          <button class="drawer-apply" type="button" (click)="apply.emit()">Apply Filters</button>
        </footer>
      </section>
    }
  `,
  styles: [`
    :host{display:contents}
    .filter-fab{position:fixed;z-index:60;inset-inline-end:max(20px,env(safe-area-inset-right));inset-block-end:max(22px,env(safe-area-inset-bottom));display:inline-flex;min-width:58px;min-height:54px;align-items:center;justify-content:center;gap:9px;padding:0 17px;color:#17231b;background:#f5d928;border:1px solid #e5ca17;border-radius:999px;box-shadow:0 8px 28px rgba(16,42,27,.24);font:inherit;font-size:.82rem;font-weight:850;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
    .filter-fab:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(16,42,27,.3)}
    .filter-fab:focus-visible,.drawer-close:focus-visible,.drawer-footer button:focus-visible{outline:3px solid color-mix(in srgb,#174d35 45%,transparent);outline-offset:3px}
    .filter-fab svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .filter-count{display:grid;min-width:21px;height:21px;place-items:center;padding:0 5px;color:#fff;background:#174d35;border-radius:999px;font-size:.68rem;font-weight:850}
    .filter-backdrop{position:fixed;z-index:1000;inset:0;background:rgba(15,23,42,.42)}
    .filter-drawer{position:fixed;z-index:1001;inset-block:var(--bbg-header-height,76px) 0;inset-inline-end:0;display:flex;width:clamp(18rem,22vw,24rem);max-width:100vw;height:auto;flex-direction:column;overflow:hidden;color:var(--text-primary);background:var(--surface-card);border-inline-start:1px solid var(--border);box-shadow:-18px 0 50px rgba(0,0,0,.18);animation:drawer-in .2s ease-out}
    .drawer-header{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:16px;padding:22px 24px 18px;border-bottom:1px solid var(--border)}
    .drawer-eyebrow{margin:0 0 4px;color:var(--text-secondary);font-size:.62rem;font-weight:850;letter-spacing:.15em}
    .drawer-header h2{margin:0;color:var(--text-primary);font-size:1.35rem;letter-spacing:-.04em}
    .drawer-close{display:grid;width:40px;height:40px;place-items:center;color:var(--text-primary);background:var(--surface-subtle);border:1px solid var(--border);border-radius:10px;font-size:1.5rem;line-height:1;cursor:pointer}
    .drawer-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:22px 24px}
    .drawer-footer{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:12px;padding:15px 24px calc(15px + env(safe-area-inset-bottom));background:var(--surface-card);border-top:1px solid var(--border)}
    .drawer-footer button{min-height:46px;padding:0 18px;border-radius:9px;font:inherit;font-size:.8rem;font-weight:800;cursor:pointer}
    .drawer-reset{color:var(--text-secondary);background:transparent;border:1px solid var(--border)}
    .drawer-apply{flex:1;color:#17231b;background:#f5d928;border:1px solid #f5d928}
    @keyframes drawer-in{from{opacity:.75;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
    @media(min-width:768px) and (max-width:1023.98px){.filter-drawer{width:min(80vw,27.5rem)}.filter-fab{inset-inline-end:18px;inset-block-end:18px}}
    @media(max-width:767.98px){.filter-fab{inset-inline-end:max(14px,env(safe-area-inset-right));inset-block-end:max(16px,env(safe-area-inset-bottom));min-width:54px;min-height:52px;padding:0 15px}.filter-drawer{inset-block:var(--bbg-header-height,66px) 0;inset-inline:0;width:100%;max-width:100%;height:auto;border:0;box-shadow:none;animation:drawer-in .16s ease-out}.drawer-header{padding:calc(14px + env(safe-area-inset-top)) 18px 14px}.drawer-body{padding:18px}.drawer-footer{padding:12px 18px calc(12px + env(safe-area-inset-bottom))}}
    @media(max-width:360px){.filter-fab{min-width:50px;min-height:50px;padding:0 13px}.filter-fab span:not(.filter-count){display:none}}
    @media(prefers-reduced-motion:reduce){.filter-fab,.filter-drawer{transition:none;animation:none}}
  `],
})
export class FilterDrawer implements OnChanges, AfterViewChecked, OnDestroy {
  @Input() open = false;
  @Input() activeCount = 0;
  @Output() openChange = new EventEmitter<boolean>();
  @Output() apply = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('drawer') private drawer?: ElementRef<HTMLElement>;

  private previousBodyOverflow = '';
  private focusPending = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        this.focusPending = true;
      } else {
        document.body.style.overflow = this.previousBodyOverflow;
        this.trigger?.nativeElement.focus();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.open) {
      document.body.style.overflow = this.previousBodyOverflow;
    }
  }

  ngAfterViewChecked(): void {
    if (this.open && this.focusPending && this.drawer) {
      this.drawer.nativeElement.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      this.focusPending = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab' || !this.drawer) return;
    const focusable = Array.from(this.drawer.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  close(): void {
    this.openChange.emit(false);
  }
}
