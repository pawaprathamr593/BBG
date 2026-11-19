import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-business-profile-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-profile-module.html',
  styleUrl: './business-profile-module.scss',
})
export class BusinessProfileModule {
  readonly business = input.required<Record<string, unknown>>();
  readonly canEdit = input(false);
  readonly editRequested = output<void>();

  readonly fields = [
    { key: 'business_name', label: 'Business name' },
    { key: 'business_email', label: 'Business email' },
    { key: 'business_phone', label: 'Business phone' },
    { key: 'business_description', label: 'Description', wide: true },
    { key: 'address_line_1', label: 'Address line 1' },
    { key: 'address_line_2', label: 'Address line 2' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'postal_code', label: 'Postal code' },
  ];

  display(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Not provided';
    return String(value);
  }

  status(): string {
    return String(this.business()['approval_status'] ?? this.business()['business_approval_status'] ?? this.business()['business_status'] ?? 'On record');
  }
}
