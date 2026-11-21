import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductCardComponent } from './product-card';
import type { ProductCardModel } from '../../models/marketplace-card.models';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;
  let whatsAppService: WhatsAppService;

  const mockProductWithPrice: ProductCardModel = {
    id: 1,
    product_name: 'High Precision CNC Milling Tool',
    description: 'Carbide end mill tool for industrial metal cutting and precision CNC work.',
    category_name: 'Industrial Tools',
    brand_name: 'ToolTech Pro',
    selling_price: 24500,
    featured: true,
    availability_status: 'In Stock',
    unit: { symbol: 'pc' },
    created_on: '2026-11-10T00:00:00Z',
    primary_image_url: 'https://example.com/cnc-tool.jpg',
    media: [
      { id: 1, media_type: 'IMAGE', url: 'https://example.com/cnc-tool.jpg' },
      { id: 2, media_type: 'IMAGE', url: 'https://example.com/cnc-tool-side.jpg' },
    ],
    business: {
      business_name: 'Precision Engineering Tools',
      business_slug: 'precision-engineering-tools',
      logo_path: 'https://example.com/biz-logo.png',
      city: 'Pune',
      state: 'Maharashtra',
      whatsapp_enabled: true,
      whatsapp_number: '+91 98765 43210',
      country_code: 'IN',
    },
  };

  const mockProductPriceOnRequest: ProductCardModel = {
    ...mockProductWithPrice,
    id: 2,
    selling_price: undefined,
  };

  const mockProductWithoutWhatsApp: ProductCardModel = {
    ...mockProductWithPrice,
    id: 3,
    business: {
      business_name: 'Precision Engineering Tools',
      business_slug: 'precision-engineering-tools',
      whatsapp_enabled: false,
      whatsapp_number: null,
      country_code: 'IN',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
      providers: [WhatsAppService],
    }).compileComponents();

    whatsAppService = TestBed.inject(WhatsAppService);
    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
  });

  it('should create product card component', () => {
    fixture.componentRef.setInput('product', mockProductWithPrice);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render product image, featured badge, and extra media count', () => {
    fixture.componentRef.setInput('product', mockProductWithPrice);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.product-image') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('cnc-tool.jpg');

    const featured = fixture.nativeElement.querySelector('.featured-badge');
    expect(featured.textContent).toContain('Featured');

    const badge = fixture.nativeElement.querySelector('.media-count-badge');
    expect(badge.textContent).toContain('+1 photos');
  });

  it('should display fallback placeholder when image is missing or fails to load', () => {
    fixture.componentRef.setInput('product', mockProductWithPrice);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.product-image') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.product-image-placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent).toContain('HP');
  });

  it('should display State A (PRODUCT PRICE) formatted price when valid price exists', () => {
    fixture.componentRef.setInput('product', mockProductWithPrice);
    fixture.componentRef.setInput('currency', 'INR');
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.pricing-panel.price-available');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('PRODUCT PRICE');
    expect(panel.textContent).toContain('₹24,500');

    const waBtn = fixture.nativeElement.querySelector('.btn-action-whatsapp') as HTMLButtonElement;
    expect(waBtn.textContent).toContain('WhatsApp');
  });

  it('should display State B (PRICE ON REQUEST) when price is absent or zero and open price enquiry', () => {
    fixture.componentRef.setInput('product', { ...mockProductPriceOnRequest, selling_price: 0 });
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.pricing-panel.price-on-request');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('PRICE ON REQUEST');
    expect(panel.textContent).toContain('Price on Request');
    expect(panel.textContent).not.toContain('₹0');

    const waButtons = fixture.nativeElement.querySelectorAll('.btn-action-whatsapp');
    expect(waButtons.length).toBe(1);
    expect(waButtons[0].textContent).toContain('Contact Business for Price');

    const spy = vi.spyOn(whatsAppService, 'openProductPriceEnquiry').mockReturnValue(true);
    (waButtons[0] as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledWith('High Precision CNC Milling Tool', '+91 98765 43210', 'IN');
  });

  it('should trigger openProductEnquiry when product has a valid price', () => {
    fixture.componentRef.setInput('product', mockProductWithPrice);
    fixture.detectChanges();

    const spy = vi.spyOn(whatsAppService, 'openProductEnquiry').mockReturnValue(true);
    const waBtn = fixture.nativeElement.querySelector('.btn-action-whatsapp') as HTMLButtonElement;
    waBtn.click();

    expect(spy).toHaveBeenCalledWith('High Precision CNC Milling Tool', '+91 98765 43210', 'IN');
  });

  it('should omit invalid WhatsApp action when business WhatsApp is disabled or missing', () => {
    fixture.componentRef.setInput('product', mockProductWithoutWhatsApp);
    fixture.detectChanges();

    const waBtn = fixture.nativeElement.querySelector('.btn-action-whatsapp');
    expect(waBtn).toBeNull();
  });

  it('should emit selected output on View Details click and Enter keydown', () => {
    fixture.componentRef.setInput('product', mockProductWithPrice);
    fixture.detectChanges();

    const emitted: ProductCardModel[] = [];
    component.selected.subscribe((val) => emitted.push(val));

    const btn = fixture.nativeElement.querySelector('.btn-action-details') as HTMLButtonElement;
    btn.click();

    const title = fixture.nativeElement.querySelector('.product-title') as HTMLElement;
    title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted.length).toBe(2);
    expect(emitted[0]).toEqual(mockProductWithPrice);
  });

  it('should render dedicated full-width Explore Storefront button and emit businessSelected', () => {
    fixture.componentRef.setInput('product', mockProductWithPrice);
    fixture.detectChanges();

    let selectedSlug: string | null = null;
    component.businessSelected.subscribe((slug) => {
      selectedSlug = slug;
    });

    const storefrontBtn = fixture.nativeElement.querySelector(
      '.btn-explore-storefront',
    ) as HTMLButtonElement;
    expect(storefrontBtn).toBeTruthy();
    expect(storefrontBtn.textContent).toContain('Explore Storefront');
    storefrontBtn.click();

    expect(selectedSlug).toBe('precision-engineering-tools');
  });
});
