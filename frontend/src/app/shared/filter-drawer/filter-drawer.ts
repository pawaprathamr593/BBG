import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { WorkspaceDrawer } from '../workspace-drawer/workspace-drawer';

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [WorkspaceDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-drawer.html',
  styles: [`
    :host{display:contents}
    .filter-fab{position:fixed;z-index:29;inset-inline-end:max(20px,env(safe-area-inset-right));inset-block-end:max(22px,env(safe-area-inset-bottom));display:inline-flex;min-width:58px;min-height:54px;align-items:center;justify-content:center;gap:9px;padding:0 17px;color:#17231b;background:#f5d928;border:1px solid #e5ca17;border-radius:999px;box-shadow:0 8px 28px rgba(16,42,27,.24);font:inherit;font-size:.82rem;font-weight:850;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
    .filter-fab:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(16,42,27,.3)}
    .filter-fab:focus-visible,.drawer-footer button:focus-visible{outline:3px solid color-mix(in srgb,#174d35 45%,transparent);outline-offset:3px}
    .filter-fab svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .filter-count{display:grid;min-width:21px;height:21px;place-items:center;padding:0 5px;color:#fff;background:#174d35;border-radius:999px;font-size:.68rem;font-weight:850}
    .drawer-footer{justify-content:space-between}
    .drawer-footer button{min-height:46px;padding:0 18px;border-radius:9px;font:inherit;font-size:.8rem;font-weight:800;cursor:pointer}
    .drawer-reset{color:var(--text-secondary);background:transparent;border:1px solid var(--border)}
    .drawer-apply{flex:1;color:#17231b;background:#f5d928;border:1px solid #f5d928}
    @media(max-width:767.98px){.filter-fab{inset-inline-end:max(14px,env(safe-area-inset-right));inset-block-end:var(--bbg-filter-fab-bottom,max(16px,env(safe-area-inset-bottom)));min-width:54px;min-height:52px;padding:0 15px}}
    @media(max-width:360px){.filter-fab{min-width:50px;min-height:50px;padding:0 13px}.filter-fab span:not(.filter-count){display:none}}
    @media(prefers-reduced-motion:reduce){.filter-fab{transition:none}}
  `],
})
export class FilterDrawer {
  @Input() open = false;
  @Input() activeCount = 0;
  @Output() openChange = new EventEmitter<boolean>();
  @Output() apply = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  close(): void {
    this.openChange.emit(false);
  }
}
