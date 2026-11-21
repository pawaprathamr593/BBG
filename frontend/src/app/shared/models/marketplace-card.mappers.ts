import type {
  MarketplaceBusiness,
  MarketplaceBusinessDetail,
  MarketplaceProduct,
} from '../../core/marketplace/marketplace-api.service';
import type {
  BusinessCardModel,
  CardMediaModel,
  ProductCardModel,
} from './marketplace-card.models';

/**
 * Generates a URL-safe product slug segment combining the product slug/name and public identifier.
 * Shared across Marketplace and Storefront navigation so routes remain deterministic.
 */
export function buildProductRouteSlug(
  product: Pick<ProductCardModel, 'id' | 'public_id' | 'slug' | 'product_name'>,
): string {
  const baseSlug =
    product.slug ||
    (product.product_name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') ||
    'product';
  return `${baseSlug}-${product.public_id || product.id}`;
}

/**
 * Maps a MarketplaceProduct API DTO into the stable ProductCardModel presentation contract.
 * When rendered inside a specific Business Storefront, passing `storefrontContext` guarantees
 * the card's business identity, route slug, country code, and WhatsApp contact data stay
 * strictly anchored to that storefront's authoritative business context.
 */
export function mapMarketplaceProductToCardModel(
  product: MarketplaceProduct,
  storefrontContext?: MarketplaceBusinessDetail | null,
): ProductCardModel {
  const ctxBusiness = storefrontContext?.business ?? null;
  const ctxStorefront = storefrontContext?.storefront ?? null;

  const media: CardMediaModel[] | undefined = product.media?.map((item) => ({
    id: item.id,
    media_type: item.media_type,
    original_file_name: item.original_file_name,
    url: item.url,
  }));

  const countryCode =
    ctxBusiness?.address?.country_code ??
    ctxBusiness?.country_code ??
    product.business?.country_code ??
    null;

  const whatsappEnabled =
    ctxStorefront !== null
      ? ctxStorefront.whatsapp_enabled
      : (product.business?.whatsapp_enabled ?? false);

  const whatsappNumber = whatsappEnabled
    ? (ctxBusiness?.whatsapp_number ?? product.business?.whatsapp_number ?? null)
    : null;

  return {
    id: product.id,
    public_id: product.public_id,
    slug: product.slug,
    offering_type: product.offering_type,
    product_name: product.product_name,
    description: product.description,
    category_name: product.category_name,
    brand_name: product.brand_name,
    selling_price: product.selling_price,
    primary_image_url: product.primary_image_url,
    media,
    unit: { symbol: product.unit?.symbol ?? '' },
    business: {
      business_name: ctxBusiness?.business_name ?? product.business?.business_name ?? '',
      business_slug: ctxBusiness?.business_slug ?? product.business?.business_slug ?? '',
      logo_path: ctxBusiness?.logo_path ?? product.business?.logo_path ?? null,
      city: ctxBusiness?.city ?? product.business?.city ?? null,
      state: ctxBusiness?.state ?? product.business?.state ?? null,
      country_code: countryCode,
      whatsapp_enabled: whatsappEnabled,
      whatsapp_number: whatsappNumber,
    },
    distance_km: product.distance_km,
    popularity: product.popularity ? { engagements: product.popularity.engagements } : undefined,
    created_on: product.created_on,
  };
}

/**
 * Maps a MarketplaceBusiness API DTO into the stable BusinessCardModel presentation contract.
 */
export function mapMarketplaceBusinessToCardModel(
  business: MarketplaceBusiness,
): BusinessCardModel {
  return {
    id: business.id,
    business_name: business.business_name,
    business_slug: business.business_slug,
    business_description: business.business_description,
    category_name: business.category_name,
    logo_path: business.logo_path,
    cover_image_path: business.cover_image_path,
    city: business.city,
    state: business.state,
    country_code: business.country_code ?? null,
    whatsapp_enabled: business.whatsapp_enabled,
    whatsapp_number: business.whatsapp_enabled ? (business.whatsapp_number ?? null) : null,
    accept_online_orders: business.accept_online_orders,
    verified: true,
    rank: business.rank,
    popularity: business.popularity,
    created_on: business.created_on,
  };
}
