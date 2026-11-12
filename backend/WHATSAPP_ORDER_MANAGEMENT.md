# BBG WhatsApp order management API

Branch: `feature/auth-foundation`

## Authorization

Tenant-side order APIs require all of the following at request time:

- Authenticated, active user and active session.
- Active membership in the requested tenant.
- Active tenant-scoped `TENANT_ORDER_MANAGER` role assignment for that tenant.
- Active `ORDERS_MANAGE` permission in module `ORDERS`.
- Assignment has not expired.

The client-supplied `tenant_id` is only a selector. Every tenant query also scopes by the verified tenant, and the backend never treats the client value as proof of access.

The seed script is `database/seeds/20261112_001_tenant_order_manager.sql`. It creates the role, permission, role-permission link, and the approved assignment for `user_id=2` / `tenant_id=1`, but only when that user has an active membership. It is idempotent. The seed must be applied to the target database before the new management APIs will authorize that user.

## Endpoints

All endpoints use POST JSON and require `Authorization: Bearer <access_token>`.

The request envelope is:

```json
{
  "orderParam": {
    "actionType": "getOrders",
    "actionData": {
      "action": "listTenantWhatsAppOrders",
      "tenant_id": 1,
      "page": 1,
      "page_size": 20
    }
  }
}
```

### List incoming WhatsApp orders

`POST /api/v1/orders/tenant/list`

Use `actionType: getOrders` and `action: listTenantWhatsAppOrders`.

Required: `tenant_id`. Optional: `page`, `page_size` (1–50; default 20).

Returns order summaries and pagination metadata. Only `order_channel='WHATSAPP'` orders for the authorized tenant are included.

### Get an incoming WhatsApp order

`POST /api/v1/orders/tenant/detail`

Use `actionType: getOrders`, `action: getTenantWhatsAppOrder`, and provide `tenant_id` and `order_id`.

Returns order/customer details, item snapshots, status history, and fulfilment records. A different tenant's order is not returned.

### Confirm a WhatsApp order

`POST /api/v1/orders/tenant/confirm`

Use `actionType: manageOrders`, `action: confirmWhatsAppOrder`, and provide `tenant_id`, `order_id`, and optional `note` (maximum 500 characters).

Only a `REQUESTED` WhatsApp order can transition to `CONFIRMED`.

### Cancel a WhatsApp order

`POST /api/v1/orders/tenant/cancel`

Use `actionType: manageOrders`, `action: cancelWhatsAppOrder`, and provide `tenant_id`, `order_id`, and optional `note` (maximum 500 characters).

Only a `REQUESTED` WhatsApp order can transition to `CANCELLED`. Confirmed-order cancellation is intentionally not enabled until its operational and financial rules are defined.

## Transaction and audit behaviour

Confirm/cancel runs in a database transaction. The order row is locked, its current status is checked, the status update is scoped by tenant and channel, and a corresponding `ORDER_STATUS_HISTORY` row is inserted. Any failure rolls back both writes.

Payment and fulfilment status mutation endpoints are not included in this increment. Their allowed transitions and evidence requirements need separate business rules.

## Apply the RBAC seed locally

From the repository root, after verifying the local database and taking a backup:

```bash
docker exec -i bbg-mysql sh -c 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysql -uroot "$MYSQL_DATABASE"' < backend/database/seeds/20261112_001_tenant_order_manager.sql
```

Check the final SELECT output. `active_membership_precondition` must be `1`, and the result must show user `2`, tenant `1`, role `TENANT_ORDER_MANAGER`, and permission `ORDERS_MANAGE`.

Do not run this seed against production without reviewing the target IDs and obtaining the appropriate production authorization.
