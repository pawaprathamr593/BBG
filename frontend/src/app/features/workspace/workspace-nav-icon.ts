import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-workspace-nav-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workspace-nav-icon.html',
})
export class WorkspaceNavIconComponent {
  readonly name = input.required<string>();
}
