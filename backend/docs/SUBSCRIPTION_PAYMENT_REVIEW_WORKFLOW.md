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
3. The active Platform Admin QR configuration is captured against that subscription.
4. Owner uploads a receipt using the existing S3 proof flow.
5. Owner explicitly submits the proof for review.
6. Platform Admin reviews the business profile, selected plan, captured payment instructions and all receipt attempts.
7. Approval activates the subscription. Rejection requires a reason and returns the request to the owner for correction and resubmission.
8. Each subsequent decision is retained in the review history. Old receipts are not overwritten.
9. Subscription expiry must suspend public visibility server-side while preserving authenticated workspace access for renewal.

## Operational safety

- This migration is additive and does not run automatically.
- Back up the target database and apply to local/staging first.
- Do not apply directly to production without a reviewed rollout and verification plan.
- No live AWS resource, bucket, IAM policy, environment variable or deployment is changed by this migration.
