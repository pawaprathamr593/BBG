import type {
  MarketplaceBusinessDetail,
  MarketplaceProduct,
} from '../../core/marketplace/marketplace-api.service';
import {
  buildProductRouteSlug,
  mapMarketplaceProductToCardModel,
} from './marketplace-card.mappers';

describe('marketplace-card.mappers', () => {
  const baseProduct: MarketplaceProduct = {
    id: 42,
    public_id: 'AbCdEf1234',
    slug: 'industrial-pump',
    offering_type: 'PRODUCT',
    product_code: 'PUMP-01',
    product_name: 'Industrial Water Pump 5HP',
    description: 'Heavy duty centrifugal pump.',
    category_id: 3,
    category_name: 'Machinery',
    brand_name: 'HydroMax',
    barcode: null,
    selling_price: 18500,
    primary_image_url: 'https://cdn.example.com/pump.jpg',
    media: [
      {
        id: 1,
        media_type: 'IMAGE',
        original_file_name: 'pump.jpg',
        url: 'https://cdn.example.com/pump.jpg',
        display_order: 1,
      },
    ],
    unit: {
      id: 1,
      name: 'Piece',
      symbol: 'pc',
      quantity_precision: 0,
      is_fraction_allowed: false,
    },
    is_variant_product: false,
    created_on: '2026-11-10T00:00:00Z',
    business: {
      business_name: 'HydroTech Traders',
      business_slug: 'hydrotech-traders',
      logo_path: null,
      city: 'Pune',
      state: 'Maharashtra',
      country_code: 'IN',
      whatsapp_enabled: true,
      whatsapp_number: '+91 98765 00001',
    },
    distance_km: 4.5,
    popularity: { views: 20, likes: 5, engagements: 25 },
  };

  it('should build deterministic product route slug from slug and public_id', () => {
    expect(buildProductRouteSlug(baseProduct)).toBe('industrial-pump-AbCdEf1234');
  });

  it('should fallback to slugified product_name and numeric id when slug/public_id missing', () => {
    expect(
      buildProductRouteSlug({
        id: 99,
        product_name: 'Stainless Steel Bolt (M10 / 50mm)!',
      }),
    ).toBe('stainless-steel-bolt-m10-50mm-99');
  });

  it('should map MarketplaceProduct to ProductCardModel preserving business WhatsApp data', () => {
    const card = mapMarketplaceProductToCardModel(baseProduct);
    expect(card.id).toBe(42);
    expect(card.public_id).toBe('AbCdEf1234');
    expect(card.business.business_slug).toBe('hydrotech-traders');
    expect(card.business.whatsapp_enabled).toBe(true);
    expect(card.business.whatsapp_number).toBe('+91 98765 00001');
    expect(card.business.country_code).toBe('IN');
    expect(card.popularity?.engagements).toBe(25);
  });

  it('should anchor business identity and WhatsApp data to storefrontContext when provided', () => {
    const storefrontContext: MarketplaceBusinessDetail = {
      business: {
        id: 7,
        business_name: 'Storefront Official Name',
        business_slug: 'storefront-official',
        business_description: 'Official storefront',
        category_id: 1,
        category_name: 'Machinery',
        business_phone: null,
        business_email: null,
        logo_path: 'https://cdn.example.com/logo.png',
        cover_image_path: null,
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country_code: 'AE',
        whatsapp_enabled: true,
        whatsapp_number: '+971 50 123 4567',
        accept_online_orders: false,
        address: {
          address_line_1: null,
          address_line_2: null,
          city: 'Dubai',
          state: null,
          postal_code: null,
          country_code: 'AE',
        },
      },
      storefront: {
        title: 'Storefront Official Name',
        description: null,
        theme_code: null,
        show_prices: true,
        accept_online_orders: false,
        whatsapp_enabled: true,
        currency: 'AED',
      },
    };

    const productWithoutBusinessWhatsApp: MarketplaceProduct = {
      ...baseProduct,
      business: {
        business_name: '',
        business_slug: '',
        logo_path: null,
      },
    };

    const card = mapMarketplaceProductToCardModel(
      productWithoutBusinessWhatsApp,
      storefrontContext,
    );
    expect(card.business.business_name).toBe('Storefront Official Name');
    expect(card.business.business_slug).toBe('storefront-official');
    expect(card.business.country_code).toBe('AE');
    expect(card.business.whatsapp_enabled).toBe(true);
    expect(card.business.whatsapp_number).toBe('+971 50 123 4567');
  });

  it('should clear whatsapp_number when storefront whatsapp_enabled is false', () => {
    const disabledContext: MarketplaceBusinessDetail = {
      business: {
        id: 7,
        business_name: 'No WhatsApp Store',
        business_slug: 'no-wa-store',
        business_description: null,
        category_id: null,
        category_name: null,
        business_phone: null,
        business_email: null,
        logo_path: null,
        cover_image_path: null,
        city: null,
        state: null,
        postal_code: null,
        country_code: 'IN',
        whatsapp_enabled: false,
        whatsapp_number: '+919876543210',
        accept_online_orders: false,
      },
      storefront: {
        title: null,
        description: null,
        theme_code: null,
        show_prices: true,
        accept_online_orders: false,
        whatsapp_enabled: false,
        currency: 'INR',
      },
    };

    const card = mapMarketplaceProductToCardModel(baseProduct, disabledContext);
    expect(card.business.whatsapp_enabled).toBe(false);
    expect(card.business.whatsapp_number).toBeNull();
  });
});
