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
import type { CardMediaModel, ProductCardModel } from '../../models/marketplace-card.models';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  private readonly whatsApp = inject(WhatsAppService);

  readonly product = input.required<ProductCardModel>();
  readonly showPrice = input(true);
  readonly currency = input('₹');
  readonly showCreated = input(false);
  readonly showStoreDetails = input(true);
  readonly actionLabel = input('View Details');

  readonly selected = output<ProductCardModel>();
  readonly businessSelected = output<string>();

  protected readonly imageError = signal(false);
  protected readonly businessLogoError = signal(false);

  protected readonly displayImageUrl = computed<string | null>(() => {
    if (this.imageError()) {
      return null;
    }
    return this.product().primary_image_url || this.primaryImage() || null;
  });

  protected readonly hasValidImage = computed<boolean>(() => {
    return !this.imageError() && !!this.displayImageUrl();
  });

  protected readonly primaryVideo = computed<string | null>(() => {
    const media = this.product().media;
    if (!media || media.length === 0) return null;
    const item = media.find((m) => m.media_type === 'VIDEO' && m.url);
    return item ? item.url : null;
  });

  protected readonly extraMediaCount = computed<number>(() => {
    const count = this.product().media?.length ?? 0;
    return count > 1 ? count - 1 : 0;
  });

  protected readonly productMonogram = computed<string>(() => {
    const name = (this.product().product_name || '').trim();
    if (!name) return 'P';
    const words = name.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  protected readonly hasValidBusinessLogo = computed<boolean>(() => {
    return !this.businessLogoError() && !!this.product().business?.logo_path;
  });

  protected readonly businessMonogram = computed<string>(() => {
    const name = (this.product().business?.business_name || '').trim();
    if (!name) return 'B';
    const words = name.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  protected readonly businessLocation = computed<string | null>(() => {
    const city = (this.product().business?.city || '').trim();
    const state = (this.product().business?.state || '').trim();
    if (city && state) return `${city}, ${state}`;
    return city || state || null;
  });

  protected readonly hasValidPrice = computed<boolean>(() => {
    if (!this.showPrice()) return false;
    const raw = this.product().selling_price;
    if (raw === undefined || raw === null || raw === '') return false;
    const numeric = Number(raw);
    return Number.isFinite(numeric) && numeric > 0;
  });

  protected readonly formattedPrice = computed<string>(() => {
    const raw = this.product().selling_price;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return '';
    }
    const rawCurrency = (this.currency() || '').trim();
    const isRupee = !rawCurrency || rawCurrency.toUpperCase() === 'INR' || rawCurrency === '₹';
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(numeric);
    return isRupee ? `₹${formattedAmount}` : `${rawCurrency} ${formattedAmount}`;
  });

  protected readonly hasBusinessSlug = computed<boolean>(() => {
    return !!(this.product().business?.business_slug || '').trim();
  });

  protected readonly isWhatsAppAvailable = computed<boolean>(() => {
    const biz = this.product().business;
    if (!biz) return false;
    return this.whatsApp.isWhatsAppAvailable(
      biz.whatsapp_number,
      biz.whatsapp_enabled ?? true,
      biz.country_code,
    );
  });

  protected onImageError(): void {
    this.imageError.set(true);
  }

  protected onBusinessLogoError(): void {
    this.businessLogoError.set(true);
  }

  protected onDetailsClick(): void {
    this.selected.emit(this.product());
  }

  protected onDetailsKeydown(event: Event): void {
    event.preventDefault();
    this.selected.emit(this.product());
  }

  protected onBusinessClick(event: Event): void {
    event.stopPropagation();
    const slug = (this.product().business?.business_slug || '').trim();
    if (slug) {
      this.businessSelected.emit(slug);
    }
  }

  protected onWhatsAppClick(event: Event): void {
    event.stopPropagation();
    const biz = this.product().business;
    if (!biz) return;
    if (this.hasValidPrice()) {
      this.whatsApp.openProductEnquiry(
        this.product().product_name,
        biz.whatsapp_number,
        biz.country_code,
      );
    } else {
      this.whatsApp.openProductPriceEnquiry(
        this.product().product_name,
        biz.whatsapp_number,
        biz.country_code,
      );
    }
  }

  private primaryImage(): string | null {
    const media = this.product().media;
    if (!media || media.length === 0) return null;
    const img = media.find((m: CardMediaModel) => m.media_type === 'IMAGE' && m.url);
    return img ? img.url : null;
  }
}

/** Backward-compatible export alias */
export const ProductCard = ProductCardComponent;
export type ProductCard = ProductCardComponent;
