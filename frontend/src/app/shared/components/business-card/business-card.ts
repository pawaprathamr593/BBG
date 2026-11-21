import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { BusinessCardModel } from '../../models/marketplace-card.models';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';

export interface BusinessMetricDisplay {
  label: string;
  value: string;
}

@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-card.component.html',
  styleUrl: './business-card.component.scss',
})
export class BusinessCardComponent {
  private readonly whatsApp = inject(WhatsAppService);

  readonly business = input.required<BusinessCardModel>();
  readonly showMetrics = input(false);
  readonly showCreated = input(false);

  readonly selected = output<BusinessCardModel>();

  protected readonly logoError = signal(false);
  protected readonly coverError = signal(false);

  protected readonly hasValidLogo = computed<boolean>(() => {
    return !this.logoError() && !!this.business().logo_path;
  });

  protected readonly hasValidCover = computed<boolean>(() => {
    return !this.coverError() && !!this.business().cover_image_path;
  });

  protected readonly businessMonogram = computed<string>(() => {
    const name = (this.business().business_name || '').trim();
    if (!name) return 'B';
    const words = name.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  protected readonly formattedLocation = computed<string | null>(() => {
    const city = (this.business().city || '').trim();
    const state = (this.business().state || '').trim();
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return null;
  });

  /**
   * Computes only real metrics backed by actual API data; never invents ratings or counts.
   */
  protected readonly metrics = computed<BusinessMetricDisplay[]>(() => {
    const biz = this.business();
    const list: BusinessMetricDisplay[] = [];

    if (typeof biz.product_count === 'number' && biz.product_count >= 0) {
      list.push({
        label: biz.product_count === 1 ? 'Product' : 'Products',
        value: String(biz.product_count),
      });
    }
    if (typeof biz.years_in_operation === 'number' && biz.years_in_operation > 0) {
      list.push({ label: 'Years', value: `${biz.years_in_operation}+` });
    }
    if (typeof biz.average_rating === 'number' && biz.average_rating > 0) {
      list.push({ label: 'Rating', value: `${biz.average_rating.toFixed(1)} ★` });
    }
    if (this.showMetrics() && biz.popularity) {
      if (biz.popularity.views > 0) {
        list.push({ label: 'Views', value: String(biz.popularity.views) });
      }
      if (biz.popularity.enquiries > 0) {
        list.push({ label: 'Enquiries', value: String(biz.popularity.enquiries) });
      }
    }

    return list.slice(0, 3);
  });

  /**
   * Compact speciality / capability badges derived strictly from existing business data.
   */
  protected readonly specialityBadges = computed<string[]>(() => {
    const biz = this.business();
    const badges: string[] = [];
    if (biz.specialities?.length) {
      for (const spec of biz.specialities) {
        const clean = spec.trim();
        if (clean && !badges.includes(clean)) {
          badges.push(clean);
        }
      }
    }
    if (biz.accept_online_orders) {
      badges.push('Online Orders');
    }
    return badges.slice(0, 3);
  });

  protected readonly isWhatsAppAvailable = computed<boolean>(() => {
    const biz = this.business();
    return this.whatsApp.isWhatsAppAvailable(
      biz.whatsapp_number,
      biz.whatsapp_enabled,
      biz.country_code,
    );
  });

  protected onLogoError(): void {
    this.logoError.set(true);
  }

  protected onCoverError(): void {
    this.coverError.set(true);
  }

  protected onBusinessClick(): void {
    this.selected.emit(this.business());
  }

  protected onBusinessKeydown(event: Event): void {
    event.preventDefault();
    this.selected.emit(this.business());
  }

  protected onWhatsAppClick(event: Event): void {
    event.stopPropagation();
    const biz = this.business();
    this.whatsApp.openBusinessEnquiry(biz.business_name, biz.whatsapp_number, biz.country_code);
  }
}

/** Backward-compatible export alias */
export const BusinessCard = BusinessCardComponent;
export type BusinessCard = BusinessCardComponent;
