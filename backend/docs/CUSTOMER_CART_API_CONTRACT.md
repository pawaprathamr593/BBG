# Customer cart API contract — Phase 1

This is the implementation contract for the cart slice. All endpoints use POST and the existing request envelope:

```json
{
  "cartParam": {
    "actionType": "manageCart",
    "actionData": {
      "action": "addItem"
    }
  }
}
```

The authenticated user ID comes only from the verified Bearer access token. The client must not choose `user_id`. Tenant context must be verified against active membership; never trust a client-supplied `tenant_id` without membership validation.

## Operations

| Route | Action | Purpose |
|---|---|---|
| `POST /api/v1/cart/get` | `getCart` | Fetch the signed-in customer's active cart for the selected tenant |
| `POST /api/v1/cart/add` | `addItem` | Add product/variant and quantity |
| `POST /api/v1/cart/update` | `updateItem` | Update quantity; zero is rejected, removal is separate |
| `POST /api/v1/cart/remove` | `removeItem` | Soft-delete one cart line |
| `POST /api/v1/cart/clear` | `clearCart` | Soft-delete active lines |
| `POST /api/v1/cart/checkout` | `checkout` | Revalidate items, create a tenant order and delivery snapshot, convert cart |
| `POST /api/v1/cart/checkout` | `checkout` | Revalidate catalogue/prices and create order transactionally |

## Rules

- All reads/writes are scoped by authenticated user, tenant and `status='A'`.
- Only approved, published, active products and variants can be added.
- Quantity must be positive and respect unit precision.
- The server obtains unit price/tax from the catalogue; submitted prices are ignored.
- Add/update operations merge the same product/variant line.
- Cart operations use parameterized SQL.
- Checkout rechecks product publication and current prices, calculates subtotal/tax/discount/delivery server-side, snapshots item name/code/unit/price/tax into `ORDER_ITEMS`, writes order history, and converts the cart in one Core Service transaction.
- Do not mark a payment as successful from a QR display or uploaded proof alone.
- Cart is per tenant in Phase 1; no multi-vendor combined checkout or guest cart.
- Checkout currently uses the provisional initial order status `PLACED`, payment status `UNPAID`, and fulfilment status `UNFULFILLED`. Gateway payment capture is not part of checkout.
- The current `ORDER_ITEMS.quantity` design stores two decimal places; checkout rejects cart quantities with more than two decimal places rather than silently rounding them.
- Response contract remains `status`, `msgArr`, `data`.
