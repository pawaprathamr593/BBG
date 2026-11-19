import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-storefront-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './storefront-module.html',
  styleUrl: './storefront-module.scss',
})
export class StorefrontModule {
  readonly storefront = input.required<Record<string, unknown>>();
  readonly canEdit = input(false);
  readonly editRequested = output<void>();

  readonly fields = [
    { key: 'storefront_title', label: 'Storefront title' },
    { key: 'storefront_description', label: 'Description', wide: true },
    { key: 'show_prices', label: 'Show product prices', boolean: true },
    { key: 'accept_online_orders', label: 'Accept online orders', boolean: true },
    { key: 'whatsapp_enabled', label: 'WhatsApp contact', boolean: true },
    { key: 'whatsapp_number', label: 'WhatsApp number' },
    { key: 'theme_code', label: 'Theme code' },
  ];

  display(value: unknown, boolean = false): string {
    if (boolean) return value === true || Number(value) === 1 ? 'Enabled' : 'Disabled';
    if (value === null || value === undefined || value === '') return 'Not provided';
    return String(value);
  }

  status(): string {
    return String(this.storefront()['publication_status'] ?? 'Not published');
  }
}
