import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessCardComponent } from './business-card';
import type { BusinessCardModel } from '../../models/marketplace-card.models';
import { WhatsAppService } from '../../../core/whatsapp/whatsapp.service';

describe('BusinessCardComponent', () => {
  let component: BusinessCardComponent;
  let fixture: ComponentFixture<BusinessCardComponent>;
  let whatsAppService: WhatsAppService;

  const mockBusinessWithWhatsApp: BusinessCardModel = {
    id: 10,
    business_name: 'Apex Industrial Solutions',
    business_slug: 'apex-industrial-solutions',
    business_description: 'Leading provider of heavy engineering supplies and factory automation.',
    category_name: 'Manufacturing & Industrial',
    logo_path: 'https://example.com/logo.png',
    cover_image_path: 'https://example.com/cover.jpg',
    city: 'Pune',
    state: 'Maharashtra',
    country_code: 'IN',
    whatsapp_enabled: true,
    whatsapp_number: '+91 98765 11111',
    accept_online_orders: true,
    featured: true,
    verified: true,
    product_count: 48,
    years_in_operation: 12,
    specialities: ['CNC Tooling', 'Automation'],
    rank: 3,
    popularity: { views: 120, enquiries: 25, engagements: 145 },
    created_on: '2026-10-01T00:00:00Z',
  };

  const mockBusinessMinimal: BusinessCardModel = {
    id: 11,
    business_name: 'Minimal Enterprise',
    business_slug: 'minimal-enterprise',
    business_description: null,
    category_name: null,
    logo_path: null,
    cover_image_path: null,
    city: null,
    state: null,
    country_code: 'IN',
    whatsapp_enabled: false,
    whatsapp_number: null,
    accept_online_orders: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessCardComponent],
      providers: [WhatsAppService],
    }).compileComponents();

    whatsAppService = TestBed.inject(WhatsAppService);
    fixture = TestBed.createComponent(BusinessCardComponent);
    component = fixture.componentInstance;
  });

  it('should create business card component', () => {
    fixture.componentRef.setInput('business', mockBusinessWithWhatsApp);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render cover image, logo, featured badge, and category', () => {
    fixture.componentRef.setInput('business', mockBusinessWithWhatsApp);
    fixture.detectChanges();

    const cover = fixture.nativeElement.querySelector('.cover-image') as HTMLImageElement;
    expect(cover).toBeTruthy();
    expect(cover.src).toContain('cover.jpg');

    const logo = fixture.nativeElement.querySelector('.business-logo') as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo.src).toContain('logo.png');

    const cat = fixture.nativeElement.querySelector('.business-category-label');
    expect(cat.textContent).toContain('Manufacturing & Industrial');
  });

  it('should handle broken cover and logo images gracefully with fallbacks', () => {
    fixture.componentRef.setInput('business', mockBusinessWithWhatsApp);
    fixture.detectChanges();

    const cover = fixture.nativeElement.querySelector('.cover-image') as HTMLImageElement;
    cover.dispatchEvent(new Event('error'));
    const logo = fixture.nativeElement.querySelector('.business-logo') as HTMLImageElement;
    logo.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cover-image')).toBeNull();
    const fallback = fixture.nativeElement.querySelector('.business-logo-fallback');
    expect(fallback).toBeTruthy();
    expect(fallback.textContent).toContain('AI');
  });

  it('should render only real API metrics and omit empty metrics container when absent', () => {
    fixture.componentRef.setInput('business', mockBusinessWithWhatsApp);
    fixture.detectChanges();

    const metricsGrid = fixture.nativeElement.querySelector('.business-metrics-grid');
    expect(metricsGrid).toBeTruthy();
    expect(metricsGrid.textContent).toContain('48');
    expect(metricsGrid.textContent).toContain('12+');

    fixture.componentRef.setInput('business', mockBusinessMinimal);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.business-metrics-grid')).toBeNull();
  });

  it('should emit selected output when clicking Explore Storefront or pressing Enter on title', () => {
    fixture.componentRef.setInput('business', mockBusinessWithWhatsApp);
    fixture.detectChanges();

    const emitted: BusinessCardModel[] = [];
    component.selected.subscribe((val) => emitted.push(val));

    const btn = fixture.nativeElement.querySelector('.btn-action-storefront') as HTMLButtonElement;
    btn.click();

    const title = fixture.nativeElement.querySelector('.business-title') as HTMLElement;
    title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted.length).toBe(2);
    expect(emitted[0]).toEqual(mockBusinessWithWhatsApp);
  });

  it('should trigger WhatsAppService.openBusinessEnquiry on WhatsApp click', () => {
    fixture.componentRef.setInput('business', mockBusinessWithWhatsApp);
    fixture.detectChanges();

    const spy = vi.spyOn(whatsAppService, 'openBusinessEnquiry').mockReturnValue(true);
    const waBtn = fixture.nativeElement.querySelector('.btn-action-whatsapp') as HTMLButtonElement;
    waBtn.click();

    expect(spy).toHaveBeenCalledWith('Apex Industrial Solutions', '+91 98765 11111', 'IN');
  });

  it('should disable WhatsApp button when business has no WhatsApp available', () => {
    fixture.componentRef.setInput('business', mockBusinessMinimal);
    fixture.detectChanges();

    const waBtn = fixture.nativeElement.querySelector('.btn-action-whatsapp') as HTMLButtonElement;
    expect(waBtn.classList.contains('disabled')).toBe(true);
    expect(waBtn.disabled).toBe(true);
  });
});
