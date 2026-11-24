/**
 * Utility functions for parsing, formatting, and filtering plan entitlements and subscription grace periods.
 * Strictly enforces that negative/unavailable values (0, false, unavailable, none, no) are NEVER displayed.
 */

export interface GracePeriodInfo {
  inGracePeriod: boolean;
  isExpired: boolean;
  deadline: Date | null;
  remainingHours: number;
  remainingText: string;
}

/**
 * Human-friendly dictionary of known system entitlement codes to positive display names.
 */
const ENTITLEMENT_LABELS: Record<string, string> = {
  BUSINESS_LISTING: 'Verified Business Listing',
  'business.profile': 'Verified Business Listing',
  STOREFRONT_ACCESS: 'Public Digital Storefront',
  'storefront.enabled': 'Public Digital Storefront',
  DIRECT_CONTACT: 'Direct Phone & WhatsApp Enquiry',
  PRODUCT_MANAGEMENT: 'Product Catalogue & Inventory Management',
  'catalogue.enabled': 'Product Catalogue & Inventory Management',
  PRODUCT_LIMIT: 'Catalogue Products Limit',
  'product.limit': 'Catalogue Products Limit',
  DAILY_PROMOTION_LIMIT: 'Daily Promotional Posts',
  'promotions.enabled': 'Promotional Campaigns & Offers',
  'promotions.limit': 'Monthly Promotions Limit',
  SEO_SUGGESTIONS: 'Search Engine Optimization (SEO)',
  AEO_SUGGESTIONS: 'AI Engine Optimization (AEO)',
  GEO_SUGGESTIONS: 'Local Geo-Search Optimization (GEO)',
  ADVANCED_ANALYTICS: 'Advanced Business Analytics',
  'advanced.reports.enabled': 'Advanced Business Analytics',
  ANALYTICS_CONTENT_RECOMMENDATIONS: 'Smart Content Recommendations',
  SUPPORT_LEVEL: 'Priority Merchant Support',
  'support.level': 'Priority Merchant Support',
};

/**
 * Parses a semicolon-separated string of key=value entitlements (e.g. "BUSINESS_LISTING=TRUE;DAILY_PROMOTION_LIMIT=1")
 * and returns ONLY the positive, available features.
 *
 * FILTER RULE: Any value that is 0, '0', false, 'false', 'none', 'unavailable', 'no', 'null', or empty is OMITTED.
 */
export function parseOfferedPlanFeatures(rawEntitlements: string | null | undefined): string[] {
  if (!rawEntitlements || typeof rawEntitlements !== 'string') {
    return [];
  }

  const features: string[] = [];
  const entries = rawEntitlements.split(';');

  for (const entry of entries) {
    if (!entry.trim()) continue;
    const eqIdx = entry.indexOf('=');
    if (eqIdx === -1) continue;

    const code = entry.slice(0, eqIdx).trim();
    const val = entry.slice(eqIdx + 1).trim();
    if (!code || !val) continue;

    const lowerVal = val.toLowerCase();

    // STRICT FILTER: Exclude zero, false, none, unavailable, empty, null, undefined
    if (
      lowerVal === '0' ||
      lowerVal === '0.00' ||
      lowerVal === 'false' ||
      lowerVal === 'no' ||
      lowerVal === 'none' ||
      lowerVal === 'unavailable' ||
      lowerVal === 'null' ||
      lowerVal === 'undefined'
    ) {
      continue;
    }

    const label = ENTITLEMENT_LABELS[code] || humanizeCode(code);
    const isLimitCode = code.toUpperCase().includes('LIMIT');
    const num = Number(val);
    const isNumeric = !isNaN(num) && Number.isFinite(num);

    let featureText: string | null = null;

    if (isLimitCode && isNumeric) {
      if (num <= 0) continue;
      if (code === 'DAILY_PROMOTION_LIMIT' || code === 'promotions.limit') {
        featureText = num === 1 ? '1 Promotional Post per day' : `Up to ${num} Promotional Posts per day`;
      } else if (code === 'PRODUCT_LIMIT' || code === 'product.limit') {
        featureText = `Up to ${num} Products in Catalogue`;
      } else {
        featureText = `${label}: ${val}`;
      }
    } else if (['true', 'yes'].includes(lowerVal) || (lowerVal === '1' && !isLimitCode)) {
      featureText = label;
    } else if (isNumeric && num > 0) {
      featureText = `${label}: ${val}`;
    } else if (!['true', 'false', 'yes', 'no'].includes(lowerVal) && val) {
      featureText = `${label}: ${val}`;
    }

    if (featureText && !features.includes(featureText)) {
      features.push(featureText);
    }
  }

  return features;
}

/**
 * Humanizes an uppercase or dot-delimited code into Title Case prose.
 */
function humanizeCode(code: string): string {
  return code
    .replace(/[._]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Calculates whether a subscription is currently in the 2-day grace period.
 */
export function getGracePeriodInfo(
  subscriptionStatus: string | null | undefined,
  endsOn: string | null | undefined,
): GracePeriodInfo {
  if (!endsOn) {
    return {
      inGracePeriod: subscriptionStatus === 'GRACE_PERIOD',
      isExpired: subscriptionStatus === 'EXPIRED',
      deadline: null,
      remainingHours: 0,
      remainingText: '',
    };
  }

  const endDate = new Date(endsOn);
  if (isNaN(endDate.getTime())) {
    return {
      inGracePeriod: subscriptionStatus === 'GRACE_PERIOD',
      isExpired: subscriptionStatus === 'EXPIRED',
      deadline: null,
      remainingHours: 0,
      remainingText: '',
    };
  }

  const now = new Date();
  const graceDeadline = new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days

  const isPastEnd = now.getTime() > endDate.getTime();
  const isWithinGrace = isPastEnd && now.getTime() <= graceDeadline.getTime();
  const inGracePeriod = subscriptionStatus === 'GRACE_PERIOD' || isWithinGrace;
  const isExpired = subscriptionStatus === 'EXPIRED' || now.getTime() > graceDeadline.getTime();

  let remainingHours = 0;
  let remainingText = '';

  if (inGracePeriod) {
    const diffMs = graceDeadline.getTime() - now.getTime();
    remainingHours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
    if (remainingHours > 24) {
      const days = Math.floor(remainingHours / 24);
      const hours = remainingHours % 24;
      remainingText = `${days} day${days > 1 ? 's' : ''}${hours > 0 ? `, ${hours} hour${hours > 1 ? 's' : ''}` : ''}`;
    } else {
      remainingText = `${remainingHours} hour${remainingHours === 1 ? '' : 's'}`;
    }
  }

  return {
    inGracePeriod,
    isExpired,
    deadline: graceDeadline,
    remainingHours,
    remainingText,
  };
}
