import { TestBed } from '@angular/core/testing';
import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WhatsAppService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize international number with + sign', () => {
      expect(service.normalizePhoneNumber('+91 98765-43210')).toBe('919876543210');
      expect(service.normalizePhoneNumber('+1 (415) 555-2671')).toBe('14155552671');
      expect(service.normalizePhoneNumber('+44 20 7946 0958')).toBe('442079460958');
      expect(service.normalizePhoneNumber('+971 50 123 4567')).toBe('971501234567');
    });

    it('should normalize international number with 00 prefix', () => {
      expect(service.normalizePhoneNumber('00919876543210')).toBe('919876543210');
    });

    it('should prepend business country calling code if national number provided', () => {
      expect(service.normalizePhoneNumber('9876543210', 'IN')).toBe('919876543210');
      expect(service.normalizePhoneNumber('09876543210', 'IN')).toBe('919876543210');
      expect(service.normalizePhoneNumber('501234567', 'AE')).toBe('971501234567');
      expect(service.normalizePhoneNumber('4155552671', 'US')).toBe('14155552671');
    });

    it('should not duplicate calling code if already present without +', () => {
      expect(service.normalizePhoneNumber('919876543210', 'IN')).toBe('919876543210');
      expect(service.normalizePhoneNumber('971501234567', 'AE')).toBe('971501234567');
    });

    it('should return null for invalid, empty or incomplete phone numbers', () => {
      expect(service.normalizePhoneNumber('')).toBeNull();
      expect(service.normalizePhoneNumber(null)).toBeNull();
      expect(service.normalizePhoneNumber(undefined)).toBeNull();
      expect(service.normalizePhoneNumber('123')).toBeNull();
      expect(service.normalizePhoneNumber('abc-def-ghij')).toBeNull();
    });
  });

  describe('message generation', () => {
    it('should generate standard product enquiry message', () => {
      const msg = service.buildProductEnquiryMessage('Industrial Steel Bearings');
      expect(msg).toBe(
        'Hello, I found your product Industrial Steel Bearings on BBG Marketplace. I am interested in knowing more about this product. Could you please share the details?',
      );
    });

    it('should generate price-on-request product enquiry message', () => {
      const msg = service.buildProductPriceEnquiryMessage('Industrial Steel Bearings');
      expect(msg).toBe(
        'Hello, I found your product Industrial Steel Bearings on BBG Marketplace. I am interested in knowing its price and further details. Could you please share the information?',
      );
    });

    it('should generate standard business enquiry message', () => {
      const msg = service.buildBusinessEnquiryMessage('Apex Engineering Ltd');
      expect(msg).toBe(
        'Hello, I found your business Apex Engineering Ltd on BBG Marketplace. I would like to know more about your products and services.',
      );
    });
  });

  describe('buildWhatsAppUrl', () => {
    it('should generate valid wa.me URL with encoded message', () => {
      const url = service.buildProductEnquiryUrl('Grade A Basmati Rice', '+91 98765 43210', 'IN');
      expect(url).not.toBeNull();
      expect(url).toContain('https://wa.me/919876543210?text=');
      expect(url).toContain(encodeURIComponent('Grade A Basmati Rice'));
    });

    it('should return null when phone number is missing or invalid', () => {
      expect(service.buildProductEnquiryUrl('Product A', null, 'IN')).toBeNull();
      expect(service.buildBusinessEnquiryUrl('Business B', '', 'IN')).toBeNull();
    });
  });

  describe('isWhatsAppAvailable', () => {
    it('should return true when phone is valid and whatsapp_enabled is true', () => {
      expect(service.isWhatsAppAvailable('+919876543210', true)).toBe(true);
    });

    it('should return false when whatsapp_enabled is false', () => {
      expect(service.isWhatsAppAvailable('+919876543210', false)).toBe(false);
    });

    it('should return false when phone is null or invalid', () => {
      expect(service.isWhatsAppAvailable(null, true)).toBe(false);
      expect(service.isWhatsAppAvailable('', true)).toBe(false);
    });
  });
});
