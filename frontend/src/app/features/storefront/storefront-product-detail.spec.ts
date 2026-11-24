import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StorefrontProductDetail } from './storefront-product-detail';
import { StorefrontContextService } from './storefront-context.service';
import { MarketplaceApiService, MarketplaceProductDetail } from '../../core/marketplace/marketplace-api.service';
import { WhatsAppService } from '../../core/whatsapp/whatsapp.service';
import { StorefrontSeoService } from './storefront-seo.service';

describe('StorefrontProductDetail — Price Handling & Fallbacks', () => {
  let component: StorefrontProductDetail;
  let fixture: ComponentFixture<StorefrontProductDetail>;
  let whatsAppService: WhatsAppService;
  let contextService: StorefrontContextService;

  const mockProductDetailWithZeroPrice: MarketplaceProductDetail = {
    product: {
      id: 501,
      public_id: 'prod-501',
      product_name: 'Industrial Bolt Set',
      product_code: 'BOLT-SET-01',
      description: 'High tensile strength industrial bolts.',
      selling_price: 0,
      unit: { id: 1, name: 'Pack', symbol: 'pk', is_fraction_allowed: false, quantity_precision: 0 },
      media: [],
      category_id: 1,
      category_name: 'Hardware',
      brand_name: 'BoltCo',
      barcode: null,
      tenant_id: 1,
      tenant_name: 'Acme Hardware Corp',
      business_slug: 'acme-hardware',
      created_at: '2026-11-20T00:00:00Z',
    } as any,
    variants: [
      {
        id: 1,
        variant_name: 'Small Pack',
        variant_code: 'BOLT-S',
        selling_price: 0.0,
        barcode: null,
        unit_id: null,
        unit_name: null,
        unit_symbol: null,
      },
      {
        id: 2,
        variant_name: 'Large Pack',
        variant_code: 'BOLT-L',
        selling_price: 450,
        barcode: null,
        unit_id: null,
        unit_name: null,
        unit_symbol: null,
      },
    ],
  };

  const mockBusinessDetail = {
    business: {
      id: 12,
      business_name: 'Acme Hardware Corp',
      business_slug: 'acme-hardware',
      whatsapp_number: '9876543210',
      whatsapp_enabled: true,
      country_code: 'IN',
    },
    storefront: {
      title: 'Acme Storefront',
      show_prices: true,
      currency: '₹',
      whatsapp_enabled: true,
      accept_online_orders: false,
    },
  };

  const mockMarketplaceApi = {
    getStorefrontProduct: vi.fn().mockReturnValue(
      of({
        status: 'SUCCESS',
        data: mockProductDetailWithZeroPrice,
      }),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorefrontProductDetail],
      providers: [
        provideRouter([]),
        StorefrontContextService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'productSlug' ? 'bolt-set-prod-501' : null),
              },
            },
            parent: {
              snapshot: {
                paramMap: {
                  get: (key: string) => (key === 'businessSlug' ? 'acme-hardware' : null),
                },
              },
            },
          },
        },
        { provide: MarketplaceApiService, useValue: mockMarketplaceApi },
        {
          provide: StorefrontSeoService,
          useValue: {
            update: vi.fn(),
            canonicalUrl: vi.fn((path: string) => `https://bbg.example.com${path}`),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StorefrontProductDetail);
    component = fixture.componentInstance;
    whatsAppService = TestBed.inject(WhatsAppService);
    contextService = TestBed.inject(StorefrontContextService);

    // Set storefront context
    contextService.detail.set(mockBusinessDetail as any);
    fixture.detectChanges();
  });

  describe('hasValidPrice() helper', () => {
    it('returns true for positive numbers and positive numeric strings', () => {
      expect(component.hasValidPrice(100)).toBe(true);
      expect(component.hasValidPrice('250.50')).toBe(true);
      expect(component.hasValidPrice(0.01)).toBe(true);
    });

    it('returns false for zero, 0.00, empty string, negative, null, and undefined', () => {
      expect(component.hasValidPrice(0)).toBe(false);
      expect(component.hasValidPrice('0')).toBe(false);
      expect(component.hasValidPrice('0.00')).toBe(false);
      expect(component.hasValidPrice(0.0)).toBe(false);
      expect(component.hasValidPrice(-5)).toBe(false);
      expect(component.hasValidPrice(null)).toBe(false);
      expect(component.hasValidPrice(undefined)).toBe(false);
      expect(component.hasValidPrice('')).toBe(false);
      expect(component.hasValidPrice('abc')).toBe(false);
    });
  });

  describe('formatPrice() helper', () => {
    it('formats valid positive numbers to Indian locale string', () => {
      expect(component.formatPrice(1250)).toBe('1,250');
      expect(component.formatPrice('34500.5')).toBe('34,500.5');
    });

    it('returns empty string for zero, negative or invalid values', () => {
      expect(component.formatPrice(0)).toBe('');
      expect(component.formatPrice('0.00')).toBe('');
      expect(component.formatPrice(null)).toBe('');
      expect(component.formatPrice(undefined)).toBe('');
    });
  });

  describe('Pricing UI when price is zero or 0.00', () => {
    it('displays "Price on Request" instead of ₹0 when selling_price is 0', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.commercial-pricing-card');
      expect(card).toBeTruthy();
      expect(card.textContent).toContain('Price on Request');
      expect(card.textContent).not.toContain('₹ 0');
      expect(card.textContent).not.toContain('₹0');
    });

    it('displays "Price on Request" for variant with price 0.00 and formatted price for variant with 450', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      const variantRows = fixture.nativeElement.querySelectorAll('.variants-table tbody tr');
      expect(variantRows.length).toBe(2);

      // First variant has selling_price = 0.00
      expect(variantRows[0].textContent).toContain('Price on Request');
      expect(variantRows[0].textContent).not.toContain('₹ 0');

      // Second variant has selling_price = 450
      expect(variantRows[1].textContent).toContain('₹');
      expect(variantRows[1].textContent).toContain('450');
    });

    it('shows "Contact Business for Price" on WhatsApp CTA and opens price enquiry when price is 0', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      const waBtn = fixture.nativeElement.querySelector('.btn-whatsapp-action');
      expect(waBtn).toBeTruthy();
      expect(waBtn.textContent).toContain('Contact Business for Price');

      const priceEnquirySpy = vi.spyOn(whatsAppService, 'openProductPriceEnquiry').mockReturnValue(true);
      waBtn.click();
      expect(priceEnquirySpy).toHaveBeenCalledWith('Industrial Bolt Set', '9876543210', 'IN');
    });
  });

  describe('Pricing UI when price is valid positive value', () => {
    it('displays formatted currency price and "WhatsApp Enquiry" CTA', async () => {
      component.detail.set({
        ...mockProductDetailWithZeroPrice,
        product: {
          ...mockProductDetailWithZeroPrice.product,
          selling_price: 1850,
        },
      });
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.commercial-pricing-card');
      expect(card.textContent).toContain('₹');
      expect(card.textContent).toContain('1,850');
      expect(card.textContent).toContain('per Pack');

      const waBtn = fixture.nativeElement.querySelector('.btn-whatsapp-action');
      expect(waBtn.textContent).toContain('WhatsApp Enquiry');

      const enquirySpy = vi.spyOn(whatsAppService, 'openProductEnquiry').mockReturnValue(true);
      waBtn.click();
      expect(enquirySpy).toHaveBeenCalledWith('Industrial Bolt Set', '9876543210', 'IN');
    });
  });
});
