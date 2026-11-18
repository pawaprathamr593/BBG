# BBG-SUB-001 — BBG Contribution Number (BCN) generation

| Field | Value |
| --- | --- |
| Requirement ID | BBG-SUB-001 |
| Feature | Subscription identification / BCN generation |
| Scope | Yii 3 backend and Angular frontend integration |
| Status | Implemented on `HG_CODE_IMPROVEMENTS` — migration pending application |
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

The example establishes minimum widths: `PID` is zero-padded to at least two digits and `SN` to at least five digits. Wider numeric values are preserved without truncation.

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
- Allocate `SN` from the single platform-wide serial counter. It is zero-padded to a minimum of five digits and expands without truncation.
- Construct the identifier exactly as `BCN-{YYMM}{PID}-{SN}`.
- Persist the complete BCN against the subscription record (the current logical entity is `TENANT_SUBSCRIPTIONS`).
- Enforce uniqueness at the persistence layer, not only through an application-level pre-check.
- Treat the BCN as immutable once issued, except for a lifecycle policy explicitly approved for renewals/upgrades. A change to the subscription expiry date must not silently rewrite an issued BCN.

### 4.2 Transactional integrity

- BCN allocation, persistence, and subscription approval must be part of the same database transaction.
- If BCN allocation or persistence fails, the approval transaction must fail/roll back; do not leave an approved subscription without its required BCN.
- Concurrent approvals must not allocate the same serial or BCN.
- Serial allocation uses the single InnoDB counter row selected `FOR UPDATE`; the counter update participates in the approval transaction. Do not use an unsafe `MAX(serial) + 1` read.
- Repeated approval requests, including retries after a client timeout, must be idempotent. If the subscription is already approved and has a BCN, return the existing BCN rather than allocating a new one.
- A previously issued BCN must never be replaced by a retry.

### 4.3 Read and response behaviour

- Include the persisted BCN in the successful approval result.
- Include the persisted BCN in the existing authorized tenant subscription list/detail data consumed by the Business Owner.
- Include the persisted BCN in the existing authorized admin subscription detail/list data where applicable.
- Do not expose a tenant's BCN or subscription record to another tenant.
- Do not invent a new route, action type, request DTO or response envelope as part of this requirement. Extend the existing subscription contracts only after inspecting the current Controller, InDto, versioned service and frontend data-layer implementation.
- Preserve the project's existing response structure, including the established `$resArr` convention.

## 5. Serial-number policy — confirmed implementation

The selected policy is **one global sequence across all approved subscriptions**, regardless of tenant, plan or expiry month.

| Policy item | Implemented behaviour |
| --- | --- |
| Sequence scope | One platform-wide counter shared by every approved subscription |
| Allocation point | During Platform Admin approval, inside the approval transaction |
| Rollback | Counter increment rolls back with the approval; failed approvals do not consume a serial |
| Serial width | Minimum five digits, zero-padded (for example `00001`, `00125`); expands naturally beyond five digits and is never truncated |
| Concurrency | A single InnoDB counter row is selected `FOR UPDATE` and incremented transactionally |
| Uniqueness | Unique index on `TENANT_SUBSCRIPTIONS.bcn` |

Plan ID formatting follows the supplied example: numeric plan IDs are zero-padded to a minimum of two digits (`3` becomes `03`); larger IDs are not truncated.

The exact identifier is constructed as:

```text
BCN-{YYMM}{PID}-{SN}
```

There is no separator between the expiry month and plan ID.

Existing approved subscriptions from before this feature are not backfilled by this migration. The sequence begins at `00001` for the first approval processed after the migration is applied.

**Status:** Confirmed and implemented.

## 6. Expiry-date source — confirmed implementation

The current Platform Admin approval flow explicitly accepts `starts_on` and `ends_on`. The generator uses the final `ends_on` value validated and persisted by that approval operation.

- `YYMM` is derived from the calendar year/month portion of the persisted `ends_on` value.
- The generator does not independently calculate plan duration or change the expiry date.
- The date portion is formatted from the persisted date/time value as stored; no separate timezone conversion is applied by BCN formatting.

**Status:** Confirmed from the existing approval contract and implemented.

## 7. Renewal, upgrade and expiry lifecycle

The current renewal workflow creates a new `TENANT_SUBSCRIPTIONS` record rather than modifying the previous subscription. Because BCN identifies an approved subscription record:

- Each newly created subscription record receives its own BCN when that record is approved.
- The previous subscription's BCN remains unchanged.
- Repeated approval calls for the same already-approved subscription return its existing BCN.
- Future plan-upgrade workflows must follow the same record-level rule: a new approved subscription record receives a new BCN; an existing record's BCN is immutable.
- Expiry or plan edits to an already-issued subscription do not silently rewrite its BCN.

**Status:** Implemented for the existing new-record renewal workflow. No separate plan-upgrade workflow was added.

## 8. Data and persistence impact

- Primary logical entity: `TENANT_SUBSCRIPTIONS`.
- Related lookup entity: `PLANS`.
- The subscription record already contains `tenant_id`, `plan_id`, `subscription_status`, `starts_on`, `ends_on`, `approved_by` and `approved_on` in the current implementation.
- Add nullable `TENANT_SUBSCRIPTIONS.bcn VARCHAR(64)` with a unique index.
- Add `BBG_BCN_SERIAL_COUNTER`, containing one active row whose `last_serial` value is locked and incremented within the approval transaction.
- The migration adds a unique index for the BCN column.
- Follow BBG's common audit fields and A/Z soft-delete conventions. Do not cascade-delete subscription or business history.
- Existing approved subscriptions are intentionally not backfilled; the new global sequence begins at zero when the migration is applied.
- Migration: `backend/database/migrations/20261118_001_bbg_contribution_number.sql`. It is additive and is not automatically applied. Existing approved subscriptions are not backfilled.

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

## 14. Resolved implementation decisions

1. Serial scope is global across all approved subscription records, regardless of tenant, plan or expiry month.
2. A serial is allocated only during approval. The counter increment rolls back if approval or BCN persistence fails.
3. `PID` is zero-padded to a minimum of two digits; values wider than two digits are not truncated.
4. `SN` is zero-padded to a minimum of five digits; values wider than five digits are not truncated.
5. The final Admin-entered and persisted `ends_on` supplies the expiry year/month segment.
6. The existing renewal flow creates a new subscription record; each such record receives a new BCN when approved. The earlier record's BCN remains unchanged.
7. Existing approved subscriptions are not backfilled. The global counter starts at zero after migration.
8. The migration is additive, must be reviewed against the physical schema and is applied separately by an authorized operator.

## 15. Implementation log

- Implemented global transactional serial allocation and immutable BCN persistence in the existing Platform Admin approval workflow.
- Added the BCN schema migration and migration-runbook entry; migration has not been applied to any database.
- Exposed BCN through existing Admin active/detail and tenant subscription list/detail reads.
- Added idempotent handling for repeated and concurrent approval requests.
- Frontend implementation is recorded in `frontend/requirements/workspace/REQ-WORKSPACE-001-bcn-display.md`.
