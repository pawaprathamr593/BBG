import type { MarketplaceBusiness, MarketplaceMedia, MarketplaceProduct, MarketplacePromotion } from '../../core/marketplace/marketplace-api.service';

/**
 * Shared card inputs are read-only API view models. Components render these values
 * and emit user intent; parent feature components own navigation and side effects.
 */
export type BusinessCardModel = MarketplaceBusiness;
export type ProductCardModel = MarketplaceProduct;
export type PromotionCardModel = MarketplacePromotion;
export type CardMediaModel = MarketplaceMedia;
