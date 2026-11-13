import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CustomerCartService } from './customer-cart.service';

describe('CustomerCartService', () => {
  let service: CustomerCartService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CustomerCartService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CustomerCartService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a cart for one business using the cartParam envelope', async () => {
    const result = service.getCart(42);
    const request = http.expectOne('http://localhost:8080/api/v1/cart/get');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      cartParam: { actionType: 'getCart', actionData: { tenant_id: 42 } },
    });
    const cart = { cart: null, items: [], subtotal: '0.00' };
    request.flush({ status: 'SUCCESS', msgArr: [], data: cart });
    await expect(result).resolves.toEqual(cart);
  });

  it('adds a selected product variant and quantity without sending a client price', async () => {
    const result = service.addItem(42, 8, 2, 3);
    const request = http.expectOne('http://localhost:8080/api/v1/cart/add');
    expect(request.request.body).toEqual({
      cartParam: {
        actionType: 'addItem',
        actionData: { tenant_id: 42, product_id: 8, quantity: 2, variant_id: 3 },
      },
    });
    request.flush({ status: 'SUCCESS', msgArr: [], data: { cart_id: 12 } });
    await expect(result).resolves.toEqual({ cart_id: 12 });
  });

  it('sends the required delivery snapshot fields to checkout', async () => {
    const shipping = {
      address_line_1: '12 Market Road',
      city: 'Pune',
      state: 'Maharashtra',
      postal_code: '411001',
      country_code: 'IN',
    };
    const result = service.checkout(42, shipping);
    const request = http.expectOne('http://localhost:8080/api/v1/cart/checkout');
    expect(request.request.body).toEqual({
      cartParam: { actionType: 'checkout', actionData: { tenant_id: 42, shipping_address: shipping } },
    });
    const order = {
      order_id: 90, order_number: 'BBG-42-260101-ABC123', order_status: 'PLACED',
      payment_status: 'UNPAID', subtotal: '100.00', tax_amount: '0.00', grand_total: '100.00',
    };
    request.flush({ status: 'SUCCESS', msgArr: [], data: order });
    await expect(result).resolves.toEqual(order);
  });
});
