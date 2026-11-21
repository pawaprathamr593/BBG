import { Injectable } from '@angular/core';

/**
 * Standard ISO 3166-1 alpha-2 country codes to international telephone calling codes (ITU-T E.164).
 */
export const COUNTRY_CALLING_CODES: Record<string, string> = {
  IN: '91',
  US: '1',
  CA: '1',
  GB: '44',
  UK: '44',
  AE: '971',
  SA: '966',
  SG: '65',
  AU: '61',
  DE: '49',
  FR: '33',
  MY: '60',
  NZ: '64',
  ZA: '27',
  JP: '81',
  CN: '86',
  ID: '62',
  PH: '63',
  TH: '66',
  VN: '84',
  KR: '82',
  BD: '880',
  LK: '94',
  NP: '977',
  PK: '92',
  QA: '974',
  KW: '965',
  OM: '968',
  BH: '973',
  EG: '20',
  KE: '254',
  NG: '234',
  BR: '55',
  MX: '52',
  IT: '39',
  ES: '34',
  NL: '31',
  SE: '46',
  CH: '41',
  TR: '90',
  RU: '7',
  KZ: '7',
};

@Injectable({
  providedIn: 'root',
})
export class WhatsAppService {
  /**
   * Normalizes any input telephone number into a valid international digits-only format suitable for wa.me.
   *
   * Rules:
   * 1. Strips spaces, brackets, hyphens, dots, and formatting characters.
   * 2. If the number explicitly begins with '+' or '00', strips the prefix and preserves the international number.
   * 3. If no '+' prefix exists and a valid country calling code is known from stored business country data,
   *    safely prepends the calling code if not already present.
   * 4. Does NOT append arbitrary calling codes if country calling code is not identifiable.
   * 5. Enforces standard ITU-T E.164 length constraints (8 to 15 digits).
   */
  normalizePhoneNumber(
    rawNumber: string | null | undefined,
    countryCode?: string | null,
  ): string | null {
    if (!rawNumber || typeof rawNumber !== 'string') {
      return null;
    }

    const trimmed = rawNumber.trim();
    if (!trimmed) {
      return null;
    }

    // Explicit international notation: + or 00
    if (trimmed.startsWith('+')) {
      const cleanDigits = trimmed.replace(/\D/g, '');
      if (cleanDigits.length >= 8 && cleanDigits.length <= 15) {
        return cleanDigits;
      }
      return null;
    }

    if (trimmed.startsWith('00')) {
      const cleanDigits = trimmed.slice(2).replace(/\D/g, '');
      if (cleanDigits.length >= 8 && cleanDigits.length <= 15) {
        return cleanDigits;
      }
      return null;
    }

    // Clean all non-digit characters
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (!digitsOnly) {
      return null;
    }

    // Remove leading trunk prefix zeros (e.g. 09876543210 -> 9876543210)
    const strippedZeros = digitsOnly.replace(/^0+/, '');
    if (!strippedZeros) {
      return null;
    }

    // Resolve country calling code from stored business country information
    const callingCode = countryCode
      ? COUNTRY_CALLING_CODES[countryCode.trim().toUpperCase()] || null
      : null;

    if (callingCode) {
      // If the number already begins with the country's calling code and has standard international length
      if (strippedZeros.startsWith(callingCode) && strippedZeros.length >= callingCode.length + 7) {
        if (strippedZeros.length <= 15) {
          return strippedZeros;
        }
        return null;
      }

      // If it's a local national number (typically 8 to 11 digits), prepend the business's calling code
      if (strippedZeros.length >= 7 && strippedZeros.length <= 11) {
        const fullNumber = callingCode + strippedZeros;
        if (fullNumber.length >= 8 && fullNumber.length <= 15) {
          return fullNumber;
        }
      }
    }

    // If no country calling code could be resolved or appended, check if digits already represent an international number
    if (strippedZeros.length >= 10 && strippedZeros.length <= 15) {
      return strippedZeros;
    }

    // Incomplete number without sufficient international context
    return null;
  }

  /**
   * Generates a product-specific enquiry message according to BBG standards.
   */
  buildProductEnquiryMessage(productName: string): string {
    const cleanName = productName ? productName.trim() : 'this product';
    return `Hello, I found your product ${cleanName} on BBG Marketplace. I am interested in knowing more about this product. Could you please share the details?`;
  }

  /**
   * Generates a product price-on-request enquiry message according to BBG standards.
   */
  buildProductPriceEnquiryMessage(productName: string): string {
    const cleanName = productName ? productName.trim() : 'this product';
    return `Hello, I found your product ${cleanName} on BBG Marketplace. I am interested in knowing its price and further details. Could you please share the information?`;
  }

  /**
   * Generates a general business enquiry message according to BBG standards.
   */
  buildBusinessEnquiryMessage(businessName: string): string {
    const cleanName = businessName ? businessName.trim() : 'your business';
    return `Hello, I found your business ${cleanName} on BBG Marketplace. I would like to know more about your products and services.`;
  }

  /**
   * Builds the official WhatsApp click-to-chat URL: https://wa.me/<number>?text=<encoded_message>
   * Returns null if the number cannot be resolved to a valid international number.
   */
  buildWhatsAppUrl(
    phone: string | null | undefined,
    message: string,
    countryCode?: string | null,
  ): string | null {
    const normalized = this.normalizePhoneNumber(phone, countryCode);
    if (!normalized) {
      return null;
    }
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${normalized}?text=${encodedMessage}`;
  }

  /**
   * Builds a product enquiry WhatsApp click-to-chat URL.
   */
  buildProductEnquiryUrl(
    productName: string,
    phone: string | null | undefined,
    countryCode?: string | null,
  ): string | null {
    const message = this.buildProductEnquiryMessage(productName);
    return this.buildWhatsAppUrl(phone, message, countryCode);
  }

  /**
   * Builds a product price-on-request enquiry WhatsApp click-to-chat URL.
   */
  buildProductPriceEnquiryUrl(
    productName: string,
    phone: string | null | undefined,
    countryCode?: string | null,
  ): string | null {
    const message = this.buildProductPriceEnquiryMessage(productName);
    return this.buildWhatsAppUrl(phone, message, countryCode);
  }

  /**
   * Builds a general business enquiry WhatsApp click-to-chat URL.
   */
  buildBusinessEnquiryUrl(
    businessName: string,
    phone: string | null | undefined,
    countryCode?: string | null,
  ): string | null {
    const message = this.buildBusinessEnquiryMessage(businessName);
    return this.buildWhatsAppUrl(phone, message, countryCode);
  }

  /**
   * Determines whether WhatsApp enquiry is available for the given contact.
   */
  isWhatsAppAvailable(
    phone: string | null | undefined,
    whatsappEnabled: boolean | null | undefined = true,
    countryCode?: string | null,
  ): boolean {
    if (whatsappEnabled === false) {
      return false;
    }
    return this.normalizePhoneNumber(phone, countryCode) !== null;
  }

  /**
   * Safely opens WhatsApp in a new tab without automated transmission.
   * Returns true if opened successfully, false if the number or URL is invalid.
   */
  openWhatsAppUrl(url: string | null): boolean {
    if (!url) {
      return false;
    }
    try {
      if (typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      }
    } catch {
      // Safe fallback
    }
    return false;
  }

  /**
   * Resolves, constructs and safely opens a product enquiry in WhatsApp.
   */
  openProductEnquiry(
    productName: string,
    phone: string | null | undefined,
    countryCode?: string | null,
  ): boolean {
    const url = this.buildProductEnquiryUrl(productName, phone, countryCode);
    return this.openWhatsAppUrl(url);
  }

  /**
   * Resolves, constructs and safely opens a product price-on-request enquiry in WhatsApp.
   */
  openProductPriceEnquiry(
    productName: string,
    phone: string | null | undefined,
    countryCode?: string | null,
  ): boolean {
    const url = this.buildProductPriceEnquiryUrl(productName, phone, countryCode);
    return this.openWhatsAppUrl(url);
  }

  /**
   * Resolves, constructs and safely opens a business enquiry in WhatsApp.
   */
  openBusinessEnquiry(
    businessName: string,
    phone: string | null | undefined,
    countryCode?: string | null,
  ): boolean {
    const url = this.buildBusinessEnquiryUrl(businessName, phone, countryCode);
    return this.openWhatsAppUrl(url);
  }
}
