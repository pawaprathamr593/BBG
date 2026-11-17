# BBG Subscription Payment & Review Workflow

## Existing capabilities confirmed in the feature branch

- Tenant subscription requests and renewal requests are created through the existing subscription Core Services.
- Payment proof uploads use server-issued, tenant-scoped S3 presigned PUT URLs. The server verifies object existence, MIME type, file signature, extension and size before accepting proof metadata.
- Platform Admin review queue, subscription detail, approve and reject actions already exist in Admin Services.
- Rejection requires a reason. Approval activates the subscription and marks pending payment proofs approved; rejection marks the proof rejected.
- The existing admin detail endpoint returns payment proof records, including prior proof submissions.

## Additive database support in this release

Migration `20261117_002_subscription_payment_review_workflow.sql` adds:

1. `PLATFORM_PAYMENT_QR_CONFIG`: versioned Platform Admin UPI QR configuration.
2. `TENANT_SUBSCRIPTION_PAYMENT_INSTRUCTIONS`: immutable copy of the QR/UPI instructions associated with a subscription request so later QR changes do not rewrite what the payer originally saw.
3. `TENANT_SUBSCRIPTION_REVIEW_HISTORY`: append-only decision timeline, including a backfill of existing ACTIVE/REJECTED decisions where the available legacy fields permit it.

## Required workflow

1. Business owner submits business registration.
2. Business owner selects a plan and creates a subscription request.
3. Platform Admin configures the current UPI payee details and uploads a QR image from **Dashboard → Payment QR settings**. Each saved QR is a new version.
4. The active Platform Admin QR configuration is captured against that subscription. Later QR changes do not alter existing requests.
5. Owner uploads a receipt using the existing S3 proof flow.
6. Owner explicitly clicks **Submit for Review**. Until this action, the request is not visible in the Admin review queue.
7. Platform Admin reviews the business profile, selected plan, captured payment instructions and all receipt attempts from the subscription detail panel.
8. Approval activates the subscription. Rejection requires a reason and returns the request to the owner for correction and resubmission.
9. When the owner submits a replacement receipt after rejection, the subscription returns to PENDING and re-enters the Admin queue. Previous receipts and decisions remain in history.
10. Each subsequent decision is retained in the review history. Old receipts are not overwritten.
11. Subscription expiry suspends public visibility server-side while preserving authenticated workspace access for renewal. The owner sees EXPIRED in subscription history and can request renewal.

## Operational safety

- This migration is additive and does not run automatically.
- Back up the target database and apply to local/staging first.
- Do not apply directly to production without a reviewed rollout and verification plan.
- No live AWS resource, bucket, IAM policy, environment variable or deployment is changed by this migration.


## API additions

Platform Admin routes (all require the existing `SUBSCRIPTIONS_APPROVE` platform permission):

- `POST /api/v1/admin/subscriptions/payment-qr/current` — read the current QR configuration.
- `POST /api/v1/admin/subscriptions/payment-qr/upload-url` — create a server-issued S3 upload URL for a QR image.
- `POST /api/v1/admin/subscriptions/payment-qr/save` — verify the uploaded image and activate a new version.

The existing tenant subscription routes remain the payment request and receipt workflow. The Admin review queue now includes only requests with a payment proof in PENDING review status.

## Public visibility enforcement

Marketplace business, product and promotion queries require an approved business profile **and** an ACTIVE subscription whose start/end dates include the current time. This is enforced in the backend DAO queries, not only by hiding frontend links. Tenant owners retain private workspace access for subscription renewal.
