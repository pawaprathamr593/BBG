import { describe, it, expect } from 'vitest';
import { parseOfferedPlanFeatures, getGracePeriodInfo } from './subscription-plan.utils';

describe('subscription-plan.utils', () => {
  describe('parseOfferedPlanFeatures()', () => {
    it('returns empty array when rawEntitlements is null or undefined or empty', () => {
      expect(parseOfferedPlanFeatures(null)).toEqual([]);
      expect(parseOfferedPlanFeatures(undefined)).toEqual([]);
      expect(parseOfferedPlanFeatures('')).toEqual([]);
    });

    it('STRICTLY FILTERS OUT 0, 0.00, false, no, none, and unavailable', () => {
      const raw =
        'STOREFRONT_ACCESS=TRUE;PRODUCT_MANAGEMENT=false;DAILY_PROMOTION_LIMIT=0;ANALYTICS=none;SEO=unavailable;CUSTOM_DOMAIN=no';
      const features = parseOfferedPlanFeatures(raw);

      // Should only contain STOREFRONT_ACCESS
      expect(features).toEqual(['Public Digital Storefront']);
      expect(features.some((f) => f.includes('0'))).toBe(false);
      expect(features.some((f) => f.includes('false'))).toBe(false);
      expect(features.some((f) => f.includes('none'))).toBe(false);
      expect(features.some((f) => f.includes('unavailable'))).toBe(false);
    });

    it('handles negative numbers, empty values, whitespace, and malformed strings', () => {
      const raw =
        'DAILY_PROMOTION_LIMIT=-5;STOREFRONT_ACCESS=;MALFORMED_ENTRY;ANALYTICS=   ;PRODUCT_MANAGEMENT=TRUE';
      const features = parseOfferedPlanFeatures(raw);
      expect(features).toEqual(['Product Catalogue & Inventory Management']);
    });

    it('deduplicates identical feature labels from duplicate keys', () => {
      const raw =
        'STOREFRONT_ACCESS=TRUE;storefront.enabled=TRUE;DAILY_PROMOTION_LIMIT=1;DAILY_PROMOTION_LIMIT=1';
      const features = parseOfferedPlanFeatures(raw);
      expect(features).toEqual([
        'Public Digital Storefront',
        '1 Promotional Post per day',
      ]);
    });

    it('parses positive boolean entitlements into clean prose', () => {
      const raw = 'BUSINESS_LISTING=TRUE;STOREFRONT_ACCESS=yes;DIRECT_CONTACT=1';
      const features = parseOfferedPlanFeatures(raw);

      expect(features).toEqual([
        'Verified Business Listing',
        'Public Digital Storefront',
        'Direct Phone & WhatsApp Enquiry',
      ]);
    });

    it('formats positive promotion limits and product limits nicely', () => {
      const diamondRaw = 'STOREFRONT_ACCESS=TRUE;PRODUCT_MANAGEMENT=TRUE;DAILY_PROMOTION_LIMIT=1';
      expect(parseOfferedPlanFeatures(diamondRaw)).toEqual([
        'Public Digital Storefront',
        'Product Catalogue & Inventory Management',
        '1 Promotional Post per day',
      ]);

      const platinumRaw =
        'STOREFRONT_ACCESS=TRUE;PRODUCT_MANAGEMENT=TRUE;DAILY_PROMOTION_LIMIT=5;SEO_SUGGESTIONS=TRUE;ADVANCED_ANALYTICS=TRUE';
      expect(parseOfferedPlanFeatures(platinumRaw)).toEqual([
        'Public Digital Storefront',
        'Product Catalogue & Inventory Management',
        'Up to 5 Promotional Posts per day',
        'Search Engine Optimization (SEO)',
        'Advanced Business Analytics',
      ]);
    });
  });

  describe('getGracePeriodInfo()', () => {
    it('detects active status when ends_on is in future', () => {
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const info = getGracePeriodInfo('ACTIVE', future);

      expect(info.inGracePeriod).toBe(false);
      expect(info.isExpired).toBe(false);
    });

    it('detects grace period when ends_on was 12 hours ago (within 2 days)', () => {
      const past12Hours = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const info = getGracePeriodInfo('ACTIVE', past12Hours);

      expect(info.inGracePeriod).toBe(true);
      expect(info.isExpired).toBe(false);
      expect(info.remainingHours).toBeGreaterThan(0);
      expect(info.remainingHours).toBeLessThanOrEqual(37);
      expect(info.remainingText).toBeTruthy();
    });

    it('detects expired when ends_on was 3 days ago (past 2-day grace period)', () => {
      const past3Days = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const info = getGracePeriodInfo('ACTIVE', past3Days);

      expect(info.inGracePeriod).toBe(false);
      expect(info.isExpired).toBe(true);
    });
  });
});
