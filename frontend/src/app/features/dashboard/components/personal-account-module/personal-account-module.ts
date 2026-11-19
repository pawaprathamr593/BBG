import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-personal-account-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './personal-account-module.html',
  styleUrl: './personal-account-module.scss',
})
export class PersonalAccountModule {
  readonly profile = input.required<Record<string, unknown>>();
  readonly canEdit = input(false);
  readonly editRequested = output<void>();
  readonly passwordRequested = output<void>();

  initials(): string {
    return String(this.profile()['full_name'] ?? 'BB').trim().split(/\s+/).slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase()).join('') || 'BB';
  }

  display(key: string): string {
    const value = this.profile()[key];
    return value === null || value === undefined || value === '' ? 'Not provided' : String(value);
  }

  hasPassword(): boolean {
    return this.profile()['has_password'] === true || Number(this.profile()['has_password']) === 1;
  }
}
