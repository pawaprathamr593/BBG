import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketplaceBusinessDetail } from '../../models/marketplace.models';
import { MarketplaceService } from '../../services/marketplace.service';
import { CartCheckoutResult, CustomerCart, CustomerCartItem, CustomerCartService } from '../../services/customer-cart.service';

@Component({
  selector: 'app-storefront-cart',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './storefront-cart.html',
  styleUrl: './storefront-cart.scss',
})
export class StorefrontCart implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly marketplace = inject(MarketplaceService);
  private readonly cartService = inject(CustomerCartService);
  protected readonly slug = this.route.parent?.snapshot.paramMap.get('businessSlug') ?? '';
  protected readonly business = signal<MarketplaceBusinessDetail | null>(null);
  protected readonly cart = signal<CustomerCart | null>(null);
  protected readonly order = signal<CartCheckoutResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly checkoutOpen = signal(false);
  protected readonly shippingForm = this.fb.nonNullable.group({
    recipient_name: [''],
    mobile: [''],
    address_line_1: ['', Validators.required],
    address_line_2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postal_code: ['', Validators.required],
    country_code: ['IN'],
    notes: [''],
  });

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    if (!this.slug) {
      this.error.set('This cart is not connected to a business storefront.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const business = await this.marketplace.getBusiness(this.slug);
      this.business.set(business);
      const cart = await this.cartService.getCart(business.business.tenant_id);
      this.cart.set(cart);
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'Unable to load your cart.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async updateQuantity(item: CustomerCartItem, event: Event): Promise<void> {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const quantity = Number(target.value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.error.set('Enter a quantity greater than zero.');
      return;
    }
    await this.performCartAction(async () => {
      await this.cartService.updateItem(this.business()!.business.tenant_id, item.id, quantity);
      await this.reloadCart();
      this.notice.set('Cart quantity updated.');
    });
  }

  protected async removeItem(item: CustomerCartItem): Promise<void> {
    await this.performCartAction(async () => {
      await this.cartService.removeItem(this.business()!.business.tenant_id, item.id);
      await this.reloadCart();
      this.notice.set('Item removed from your cart.');
    });
  }

  protected async clearCart(): Promise<void> {
    await this.performCartAction(async () => {
      await this.cartService.clearCart(this.business()!.business.tenant_id);
      await this.reloadCart();
      this.notice.set('Your cart has been cleared.');
    });
  }

  protected async placeOrder(): Promise<void> {
    if (this.shippingForm.invalid || this.busy() || !this.business()) {
      this.shippingForm.markAllAsTouched();
      return;
    }
    const { notes, ...shippingAddress } = this.shippingForm.getRawValue();
    await this.performCartAction(async () => {
      const result = await this.cartService.checkout(this.business()!.business.tenant_id, shippingAddress, notes);
      this.order.set(result);
      this.cart.set({ cart: null, items: [], subtotal: '0.00' });
      this.checkoutOpen.set(false);
    });
  }

  protected formatMoney(value: string | number | undefined): string {
    const currency = this.business()?.storefront.currency || 'INR';
    const amount = Number(value ?? 0);
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number.isFinite(amount) ? amount : 0);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  private async reloadCart(): Promise<void> {
    const tenantId = this.business()?.business.tenant_id;
    if (!tenantId) return;
    this.cart.set(await this.cartService.getCart(tenantId));
  }

  private async performCartAction(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await action();
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'The cart action could not be completed.');
    } finally {
      this.busy.set(false);
    }
  }
}
