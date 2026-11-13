import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { CustomerCartService } from '../../services/customer-cart.service';
import { MarketplaceBusinessDetail, MarketplaceProductDetail } from '../../models/marketplace.models';
import { MarketplaceService } from '../../services/marketplace.service';
import { SeoService } from '../../../../core/seo/seo.service';

@Component({
  selector: 'app-public-product-detail',
  imports: [RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly marketplace = inject(MarketplaceService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly cartService = inject(CustomerCartService);
  protected readonly slug = this.route.snapshot.paramMap.get('businessSlug')
    ?? this.route.parent?.snapshot.paramMap.get('businessSlug') ?? '';
  private readonly productId = Number(this.route.snapshot.paramMap.get('productId'));
  protected readonly detail = signal<MarketplaceProductDetail | null>(null);
  protected readonly business = signal<MarketplaceBusinessDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly selectedVariantId = signal<number | null>(null);
  protected readonly quantity = signal('1');
  protected readonly addingToCart = signal(false);
  protected readonly cartError = signal('');
  protected readonly cartNotice = signal('');

  ngOnInit(): void { void this.load(); }

  protected onVariantChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      const value = Number(target.value);
      this.selectedVariantId.set(Number.isInteger(value) && value > 0 ? value : null);
    }
    this.cartError.set('');
  }

  protected onQuantityChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.quantity.set(target.value);
  }

  protected get quantityStep(): string {
    const product = this.detail()?.product;
    const variant = this.detail()?.variants.find((item) => item.id === this.selectedVariantId());
    const fractionAllowed = variant?.is_fraction_allowed ?? product?.unit.is_fraction_allowed;
    const precision = Number(variant?.quantity_precision ?? product?.unit.quantity_precision ?? 0);
    return fractionAllowed && precision > 0 ? String(1 / (10 ** precision)) : '1';
  }

  protected async addToCart(): Promise<void> {
    const product = this.detail()?.product;
    const business = this.business();
    if (!product || !business || this.addingToCart()) return;
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (!business.storefront.accept_online_orders) {
      this.cartError.set('Online ordering is not enabled for this business. Contact the business directly.');
      return;
    }
    const quantity = Number(this.quantity());
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.cartError.set('Enter a quantity greater than zero.');
      return;
    }
    if (product.is_variant_product && this.selectedVariantId() === null) {
      this.cartError.set('Select a product variant before adding this item.');
      return;
    }
    this.addingToCart.set(true);
    this.cartError.set('');
    this.cartNotice.set('');
    try {
      await this.cartService.addItem(business.business.tenant_id, product.id, quantity, this.selectedVariantId());
      this.cartNotice.set('Added to your business cart.');
    } catch (cause) {
      this.cartError.set(cause instanceof Error ? cause.message : 'Unable to add this product to your cart.');
    } finally {
      this.addingToCart.set(false);
    }
  }

  protected async load(): Promise<void> {
    if (!this.slug || !Number.isInteger(this.productId) || this.productId < 1) {
      this.error.set('This product link is not valid.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const [detail, business] = await Promise.all([
        this.marketplace.getProduct(this.slug, this.productId),
        this.marketplace.getBusiness(this.slug),
      ]);
      this.detail.set(detail);
      this.business.set(business);
      const product = detail.product;
      const description = product.description || `Explore ${product.product_name} from ${business.business.business_name} on BBG.`;
      const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.product_name,
        description,
        url: `/businesses/${encodeURIComponent(this.slug)}/products/${product.id}`,
        ...(product.brand_name ? { brand: { '@type': 'Brand', name: product.brand_name } } : {}),
      };
      if (business.storefront.show_prices && product.selling_price !== undefined && business.storefront.currency) {
        schema['offers'] = {
          '@type': 'Offer',
          price: String(product.selling_price),
          priceCurrency: business.storefront.currency,
        };
      }
      this.seo.update(`${product.product_name} | ${business.business.business_name} | BBG`, description,
        `/businesses/${encodeURIComponent(this.slug)}/products/${product.id}`, schema);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load this product.');
    } finally { this.loading.set(false); }
  }
}
