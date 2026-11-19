import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-payment-qr-settings-module',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-qr-settings-module.html',
  styleUrl: './payment-qr-settings-module.scss',
})
export class PaymentQrSettingsModule {
  readonly qrUrl = input<string | null>(null);
  readonly payeeName = input<unknown>('');
  readonly upiId = input<unknown>('');
  readonly instructions = input<unknown>('');
  readonly editRequested = output<void>();

  display(value: unknown, fallback: string): string {
    return value === null || value === undefined || value === '' ? fallback : String(value);
  }
}
