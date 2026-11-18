# BBG-SUB-001 — BBG Contribution Number (BCN) generation

| Field | Value |
| --- | --- |
| Requirement ID | BBG-SUB-001 |
| Feature | Subscription identification / BCN generation |
| Scope | Yii 3 backend and Angular frontend integration |
| Status | Draft — sequencing and lifecycle decisions pending |
| Related data | `TENANT_SUBSCRIPTIONS`, `PLANS` |
| Trigger | Successful Platform Admin approval of a subscription request |

## 1. Objective

Generate and persist a unique BBG Contribution Number (BCN) when a Platform Admin approves a subscription request. The BCN becomes the permanent reference identifier for that approved subscription and is returned to the frontend for read-only display to the Platform Admin and the owning Business Owner.

BCN generation is a backend responsibility. Angular must never construct or allocate the identifier.

## 2. Identifier format

The required format is:

```text
BCN-YYMMPID-SN
```

Example:

```text
BCN-271203-00125
```

| Segment | Example | Definition |
| --- | --- | --- |
| `BCN` | `BCN` | Fixed literal prefix: BBG Contribution Number |
| `YYMM` | `2712` | Two-digit year and two-digit month of the subscription expiry date |
| `PID` | `03` | Subscription's approved plan ID |
| `SN` | `00125` | Serial number allocated according to the approved sequencing policy |

The segments `YYMM` and `PID` are concatenated without an additional separator. A hyphen separates the prefix from the concatenated date/plan segment, and another hyphen separates that segment from the serial.

### Example interpretation

For `BCN-271203-00125`:

- `BCN`: fixed prefix.
- `27`: year 2027.
- `12`: expiry month December.
- `03`: plan ID as represented in the identifier.
- `00125`: serial number.

The example is illustrative. The exact padding/width rules for `PID` and `SN` must be confirmed before implementation.

## 3. Business trigger and lifecycle

1. A Business Owner submits a subscription request for a selected plan.
2. The subscription remains pending while the payment proof and request are reviewed.
3. A Platform Admin approves the subscription using the existing subscription approval workflow.
4. As part of the successful approval transaction, the backend determines the approved plan and final expiry date, allocates the next serial according to the agreed sequence policy, constructs the BCN and persists it against the approved subscription.
5. The approval response and subsequent authorized subscription reads expose the persisted BCN to the appropriate consumers.
6. The frontend displays the BCN only after the backend confirms the successful approval or returns an approved subscription containing the BCN.

Do not generate a BCN for a request that is merely created, pending review, rejected, or otherwise not approved.

## 4. Backend functional requirements

### 4.1 Generation

- Generate the BCN only in the backend during the successful Platform Admin subscription approval operation.
- Use the plan ID associated with the subscription being approved. Do not trust a plan ID supplied independently by the client at approval time.
- Derive `YYMM` from the final expiry date persisted for that subscription (`ends_on` in the current subscription data model).
- Allocate `SN` using the approved serial-number policy. The policy is currently unresolved and must not be guessed.
- Construct the identifier exactly as `BCN-{YYMM}{PID}-{SN}`.
- Persist the complete BCN against the subscription record (the current logical entity is `TENANT_SUBSCRIPTIONS`).
- Enforce uniqueness at the persistence layer, not only through an application-level pre-check.
- Treat the BCN as immutable once issued, except for a lifecycle policy explicitly approved for renewals/upgrades. A change to the subscription expiry date must not silently rewrite an issued BCN.

### 4.2 Transactional integrity

- BCN allocation, persistence, and subscription approval must be part of the same database transaction.
- If BCN allocation or persistence fails, the approval transaction must fail/roll back; do not leave an approved subscription without its required BCN.
- Concurrent approvals must not allocate the same serial or BCN.
- Serial allocation must use a concurrency-safe strategy (for example, a database-serialized counter/locking strategy) selected during implementation. Do not rely on an unsafe `MAX(serial) + 1` read without transaction/locking protection.
- Repeated approval requests, including retries after a client timeout, must be idempotent. If the subscription is already approved and has a BCN, return the existing BCN rather than allocating a new one.
- A previously issued BCN must never be replaced by a retry.

### 4.3 Read and response behaviour

- Include the persisted BCN in the successful approval result.
- Include the persisted BCN in the existing authorized tenant subscription list/detail data consumed by the Business Owner.
- Include the persisted BCN in the existing authorized admin subscription detail/list data where applicable.
- Do not expose a tenant's BCN or subscription record to another tenant.
- Do not invent a new route, action type, request DTO or response envelope as part of this requirement. Extend the existing subscription contracts only after inspecting the current Controller, InDto, versioned service and frontend data-layer implementation.
- Preserve the project's existing response structure, including the established `$resArr` convention.

## 5. Serial-number policy — decision required

The user's initial direction is that the serial number is based on the last approved business. The precise sequence scope is not yet defined.

Options requiring product confirmation:

| Option | Sequence behaviour |
| --- | --- |
| Global | One sequence across all approved businesses/subscriptions, regardless of plan and expiry month |
| Monthly | Sequence resets for each expiry month |
| Plan-wise | Each plan has an independent sequence |
| Plan + expiry month | Sequence resets for each plan and expiry-month combination |

The selected policy must define:
- Whether the sequence is global or partitioned.
- Whether a serial is consumed only after approval succeeds.
- Whether a serial allocated during a rolled-back approval can be reused or is allowed to leave a gap.
- Serial width, zero-padding and behaviour after the configured width is exceeded.
- Whether the sequence is scoped to a business, tenant, plan, expiry month or the whole platform.

**Current status:** UNKNOWN — do not implement serial allocation until confirmed.

## 6. Expiry-date source — decision required

The `YYMM` segment must be calculated from the subscription's final expiry date.

The current subscription data model stores `ends_on`. The product decision still needs to confirm how that value is established during approval:

- Is expiry calculated from the approved plan's duration/billing cycle?
- Or does the Platform Admin set/override the expiry date during approval?

The generator must use the final persisted `ends_on` value after the approval workflow has applied the agreed expiry rule. It must not calculate a different expiry independently from the frontend.

**Current status:** UNKNOWN — confirm the expiry source and timezone/date-boundary convention before implementation.

## 7. Renewal, upgrade and expiry lifecycle — decision required

The BCN is described as the reference for an approved subscription. The treatment of a renewal or plan upgrade has not yet been confirmed.

Product must decide whether:
- Renewal preserves the existing BCN for the business, or creates a new BCN for the new subscription period.
- An upgrade preserves the current BCN or creates a new BCN for the upgraded subscription.
- A new subscription request for the same tenant/business receives a new BCN.
- Expiry-date changes after approval are prohibited, or require a controlled reissue/versioning process.

Until confirmed:
- Never overwrite an existing BCN silently.
- Approval retries return the existing BCN.
- Do not assume renewal/upgrade should generate a new identifier.

**Current status:** UNKNOWN.

## 8. Data and persistence impact

- Primary logical entity: `TENANT_SUBSCRIPTIONS`.
- Related lookup entity: `PLANS`.
- The subscription record already contains `tenant_id`, `plan_id`, `subscription_status`, `starts_on`, `ends_on`, `approved_by` and `approved_on` in the current implementation.
- Add a persisted BCN attribute to the subscription record, or use an explicitly approved equivalent schema design, after checking the current physical schema and database design documentation.
- Add a database uniqueness constraint/index for the BCN, subject to the final column definition and existing data review.
- Follow BBG's common audit fields and A/Z soft-delete conventions. Do not cascade-delete subscription or business history.
- Provide a safe migration/backfill strategy if any existing approved subscriptions need BCN values. Backfill ordering and serial assignment must follow the confirmed sequencing policy.
- No migration is authorized or included in this requirement draft.

## 9. Architecture and implementation constraints

Preserve the existing seven-layer backend architecture:

1. InDto
2. Controller
3. Versioned Services
4. Core Services
5. DAO
6. Model (reference/legacy only; do not use for new development)
7. Utils

Responsibilities:

- **Controller / InDto:** accept the existing approval request contract; do not add client-controlled BCN input.
- **Versioned Services:** preserve existing API compatibility and response-envelope conventions.
- **Core Services:** own approval orchestration, authorization, tenant checks, expiry validation, BCN generation rules, idempotency and transaction ownership.
- **DAO:** perform parameterized persistence and concurrency-safe serial allocation using the existing database access conventions.
- **Utils:** only contain reusable formatting helpers if consistent with existing architecture; no business policy hidden in generic utilities.
- **Model:** do not introduce new Active Record/business logic for this feature.

Keep the existing payment review and subscription approval behaviour intact except for the additive BCN requirement.

## 10. Security and tenant isolation

- Only an authorized Platform Admin may approve a subscription.
- Tenant-facing reads must be scoped to the authenticated tenant using the existing tenant-isolation rules.
- The client must not be able to submit or override `BCN`, `PID`, `YYMM` or `SN`.
- Do not expose serial counters or other tenants' subscription identifiers through public endpoints.
- BCN is an identifier, not an authorization token; access to subscription data must continue to be authorized independently.

## 11. Error handling and recovery

- If approval fails before commit, no approved state or BCN should remain persisted.
- If a request is retried after a successful commit, return the same BCN.
- If a uniqueness conflict occurs, handle it safely within the transaction and retry only through the approved concurrency-safe allocation strategy.
- If the final expiry date or plan ID is missing/invalid, fail approval with a clear business error; do not generate a malformed BCN.
- Log technical failures without exposing internal database details to the client.
- Preserve the existing API error envelope and message conventions.

## 12. Acceptance criteria

1. Given a subscription is pending, when it has not been approved, then no BCN is generated or stored.
2. Given a Platform Admin successfully approves a valid subscription, when the approval transaction commits, then exactly one BCN is stored for that subscription.
3. Given an expiry date and plan ID, when the BCN is constructed, then its shape is `BCN-YYMMPID-SN`, with `YYMM` taken from the final persisted expiry date.
4. Given the illustrative values expiry month December 2027, plan ID `03`, and serial `00125`, when formatted, then the example identifier is `BCN-271203-00125`.
5. Given two approvals run concurrently, when both commit, then their BCNs are unique and their serial allocation follows the confirmed sequencing policy.
6. Given an approval request is retried after a successful commit, when the backend handles the retry, then it returns the already persisted BCN and does not allocate another serial.
7. Given BCN persistence fails, when approval is processed, then the approval and BCN changes roll back together.
8. Given a tenant requests its subscription details, when the request is authorized, then the response contains the BCN for its approved subscription.
9. Given a different tenant attempts to read that subscription, when authorization is evaluated, then tenant isolation prevents access.
10. Given an existing subscription already has a BCN, when expiry or plan data is subsequently changed, then the BCN is not silently rewritten.
11. Given the serial policy, expiry source and renewal policy are not confirmed, when implementation is planned, then those unresolved decisions are treated as blockers rather than inferred.

## 13. Dependencies

- Existing Platform Admin subscription approval workflow.
- Existing tenant subscription list/detail workflow.
- Existing `TENANT_SUBSCRIPTIONS` and `PLANS` schema.
- Approved product decisions for serial-number scope, expiry-date source, identifier padding and renewal/upgrade behaviour.
- Frontend requirement: `frontend/requirements/workspace/REQ-WORKSPACE-001-bcn-display.md`.

## 14. Open decisions

1. **Serial sequence scope:** global, monthly, plan-wise, or plan + expiry month? Is the serial strictly per approved business?
2. **Expiry source:** plan-derived expiry or Admin-entered/overridden expiry?
3. **Renewal/upgrade:** preserve BCN or issue a new BCN for a new subscription period?
4. **PID representation:** is the plan ID zero-padded to two digits as in the example, or should its natural database representation be used?
5. **SN representation:** is the serial zero-padded to five digits as in the example? What happens after 99,999?
6. **Existing approved subscriptions:** should they be backfilled, and if so, what deterministic order and serial policy should be used?

## 15. Implementation log

- Requirement drafted from the user's BCN format and the existing BBG subscription/payment-review workflow.
- No source code, database schema, migration, API contract or deployment changes are included.
