# BBG Backend Architecture & Development Specification

**Document:** BBG Backend Architecture\
**Version:** 1.0\
**Status:** Architecture baseline for review --- not implementation
approval\
**Product:** BBG --- Business Management & Marketplace Platform\
**Backend stack:** Yii 3 · PHP 8.4 · MySQL 8.4 · Nginx · PHP-FPM\
**Frontend client:** Angular 22\
**Architecture source:** Supplied `.agents.zip` seven-layer
architecture\
**Database reference:** `BBG_Database_Design_v1.2.md`\
**Feature reference:**
`BBG Marketplace - Complete Features & Functionality List`\
**Related frontend reference:**
`dark_store_frontend_detailed_report_v1.0.md`

> **Important implementation boundary:** This document defines the
> proposed BBG backend structure and records confirmed directions and
> pending decisions. It does not create code, Yii configuration,
> migrations, database objects, API endpoints, provider applications, or
> deployment changes. The supplied `.agents` architecture remains the
> authority for the seven logical layers. Yii 3 adaptations below are
> framework-specific mappings, not replacements for those layers.

------------------------------------------------------------------------

## 1. Purpose

This document establishes a backend architecture for BBG that:

-   Preserves the exact seven logical layers and their responsibilities
    from the supplied `.agents.zip`.
-   Adapts framework-specific concerns from the legacy Yii 1.1 reference
    to Yii 3 and PHP 8.4.
-   Defines the boundary between public marketplace operations, private
    tenant workspaces, and platform administration.
-   Records the currently agreed authentication direction.
-   Maps candidate BBG modules through the seven layers.
-   Establishes service, DAO, response, tenancy, security, transaction,
    and database-access conventions.
-   Separates confirmed requirements from proposals and decisions that
    still require approval.

The backend is intended to support two connected product experiences:

1.  **Public storefront / marketplace:** public business discovery,
    published catalogues, promotions, enquiries and, subject to release
    approval, online orders.
2.  **Private business workspace:** tenant-scoped business operations
    for owners and authorized staff.
3.  **Platform administration:** privileged platform-level operations,
    separated from tenant roles and permissions.

## 2. Status and decision labels

The following labels are used throughout this document:

  -----------------------------------------------------------------------
  Label                               Meaning
  ----------------------------------- -----------------------------------
  **Confirmed**                       Explicitly selected or stated by
                                      the project owner.

  **Source requirement**              Stated in one of the supplied
                                      project resources.

  **Proposed**                        A recommended Yii 3 or backend
                                      design choice that still needs
                                      review.

  **Pending**                         Requires a product or technical
                                      decision before implementation.

  **Future scope**                    Documented as later capability; not
                                      part of the current implementation
                                      baseline unless separately
                                      approved.
  -----------------------------------------------------------------------

Where the source documents disagree or leave a point open, this
specification does not silently resolve it.

## 3. Confirmed technology foundation

  -----------------------------------------------------------------------
  Area                    Selection               Status
  ----------------------- ----------------------- -----------------------
  Frontend                Angular 22              Confirmed

  Backend framework       Yii 3                   Confirmed

  Backend language        PHP 8.4                 Confirmed

  Database                MySQL 8.4               Confirmed

  Web server              Nginx                   Confirmed

  PHP runtime             PHP-FPM                 Confirmed

  Database administration phpMyAdmin              Confirmed

  Version control         Git                     Confirmed

  Local development       Docker Compose on macOS Existing project
                                                  direction

  Backend architecture    Exact seven logical     Confirmed
                          layers from             
                          `.agents.zip`, adapted  
                          to Yii 3                

  Authentication          Google, Facebook and    Partly pending
                          Instagram sign-in       
                          requested; provider     
                          feasibility varies      

  Session/token strategy  Short-lived access      Confirmed direction
                          token + rotating        
                          refresh-token cookie    

  Authentication provider Not configured by this  Pending
  credentials and         document                
  production app setup                            
  -----------------------------------------------------------------------

### 3.1 Request path

Proposed Yii 3 request path:

``` text
Angular 22
   |
   | HTTPS / JSON API request
   v
Nginx
   |
   v
PHP-FPM (PHP 8.4)
   |
   v
Yii 3 routing / middleware / controller
   |
   v
InDto
   |
   v
Versioned Services (V1)
   |
   v
Core Services (Level 1 dispatcher -> Level 2 worker)
   |
   v
DAO
   |
   v
MySQL 8.4
```

Yii 3 routing, middleware, dependency injection, request/response
objects, database connection configuration and bootstrap code are
framework plumbing. They do not create additional business-logic layers.

## 4. The seven logical layers --- preserved

The supplied `.agents.zip` defines the following seven layers. Their
responsibilities are retained.

  ------------------------------------------------------------------------
                            \# Layer                 Responsibility
  ---------------------------- --------------------- ---------------------
                             1 **InDto**             Holds the module
                                                     input parameter array
                                                     with default values.
                                                     No business logic.

                             2 **Controller**        Handles the HTTP
                                                     endpoint and forwards
                                                     the expected input
                                                     envelope to the
                                                     corresponding
                                                     Versioned Services
                                                     method.

                             3 **Versioned           Converts the input
                               Services**            array into the module
                                                     InDto, invokes Core
                                                     Services, and returns
                                                     the API response.

                             4 **Core Services**     Validates the action
                                                     envelope, dispatches
                                                     actions, executes
                                                     business use cases,
                                                     performs business
                                                     validation and owns
                                                     transaction
                                                     boundaries.

                             5 **DAO**               Performs database
                                                     reads and writes
                                                     using a supplied
                                                     database connection
                                                     and scalar arguments.

                             6 **Model**             Retained as a
                                                     reference/legacy
                                                     layer; not used for
                                                     new development under
                                                     the supplied
                                                     `.agents` rules.

                             7 **Utils**             Provides reusable
                                                     helper functions that
                                                     are not business
                                                     services or database
                                                     access objects.
  ------------------------------------------------------------------------

**Non-negotiable architecture rule:** Do not replace these seven layers
with a new Controller → Application Service → Domain Service →
Repository architecture. Yii 3 components may support the existing
layers, but must not silently redefine them.

## 5. Proposed Yii 3 backend directory structure

The following is a proposed target structure. It is not a statement that
these files or directories already exist.

``` text
backend/
├── config/
│   ├── common/
│   │   ├── params.php
│   │   ├── dependencies.php
│   │   └── database.php
│   ├── web/
│   │   ├── routes.php
│   │   └── middleware.php
│   └── environments/
│       ├── development/
│       └── production/
│
├── public/
│   └── index.php
│
├── runtime/
│
├── src/
│   ├── Modules/
│   │   └── Api/
│   │       └── V1/
│   │           ├── Dto/
│   │           │   └── In/
│   │           │       ├── AuthInDto.php
│   │           │       ├── UserInDto.php
│   │           │       ├── TenantInDto.php
│   │           │       ├── BusinessInDto.php
│   │           │       ├── CatalogueInDto.php
│   │           │       ├── CustomerInDto.php
│   │           │       ├── EnquiryInDto.php
│   │           │       ├── OrderInDto.php
│   │           │       ├── PaymentInDto.php
│   │           │       ├── SubscriptionInDto.php
│   │           │       ├── PromotionInDto.php
│   │           │       └── AdminInDto.php
│   │           │
│   │           ├── Controllers/
│   │           │   ├── AuthController.php
│   │           │   ├── UserController.php
│   │           │   ├── TenantController.php
│   │           │   ├── BusinessController.php
│   │           │   ├── CatalogueController.php
│   │           │   ├── CustomerController.php
│   │           │   ├── EnquiryController.php
│   │           │   ├── OrderController.php
│   │           │   ├── PaymentController.php
│   │           │   ├── SubscriptionController.php
│   │           │   ├── PromotionController.php
│   │           │   └── AdminController.php
│   │           │
│   │           └── Services/
│   │               ├── Interfaces/
│   │               │   ├── IAuthServicesV1.php
│   │               │   ├── IUserServicesV1.php
│   │               │   ├── ITenantServicesV1.php
│   │               │   └── ...
│   │               └── Implementations/
│   │                   ├── AuthServicesV1.php
│   │                   ├── UserServicesV1.php
│   │                   ├── TenantServicesV1.php
│   │                   └── ...
│   │
│   ├── Services/
│   │   ├── Interfaces/
│   │   │   ├── IAuthServices.php
│   │   │   ├── IUserServices.php
│   │   │   ├── ITenantServices.php
│   │   │   ├── IBusinessServices.php
│   │   │   ├── ICatalogueServices.php
│   │   │   ├── ICustomerServices.php
│   │   │   ├── IEnquiryServices.php
│   │   │   ├── IOrderServices.php
│   │   │   ├── IPaymentServices.php
│   │   │   ├── ISubscriptionServices.php
│   │   │   ├── IPromotionServices.php
│   │   │   └── IAdminServices.php
│   │   └── Implementations/
│   │       ├── AuthServices.php
│   │       ├── UserServices.php
│   │       ├── TenantServices.php
│   │       ├── BusinessServices.php
│   │       ├── CatalogueServices.php
│   │       ├── CustomerServices.php
│   │       ├── EnquiryServices.php
│   │       ├── OrderServices.php
│   │       ├── PaymentServices.php
│   │       ├── SubscriptionServices.php
│   │       ├── PromotionServices.php
│   │       └── AdminServices.php
│   │
│   ├── Dao/
│   │   ├── AuthDao.php
│   │   ├── UserDao.php
│   │   ├── TenantDao.php
│   │   ├── BusinessDao.php
│   │   ├── CatalogueDao.php
│   │   ├── CustomerDao.php
│   │   ├── EnquiryDao.php
│   │   ├── OrderDao.php
│   │   ├── PaymentDao.php
│   │   ├── SubscriptionDao.php
│   │   ├── PromotionDao.php
│   │   └── AdminDao.php
│   │
│   ├── Models/
│   │   └── README.md
│   │
│   └── Utils/
│       ├── JsonUtils.php
│       ├── DateTimeUtils.php
│       ├── ValidationUtils.php
│       └── ...
│
├── tests/
│   ├── Unit/
│   ├── Integration/
│   └── Api/
│
├── composer.json
└── .env
```

### 5.1 Directory interpretation

-   `src/Modules/Api/V1/Dto/In` represents the InDto layer.
-   `src/Modules/Api/V1/Controllers` represents the Controller layer.
-   `src/Modules/Api/V1/Services` represents the Versioned Services
    layer.
-   `src/Services` represents Core Services.
-   `src/Dao` represents DAO.
-   `src/Models` retains the Model reference layer but is not used for
    new development.
-   `src/Utils` represents Utils.
-   `config/`, `public/`, `runtime/`, `tests/`, `composer.json` and
    `.env` are Yii/application support structure, not extra business
    layers.

### 5.2 Yii 3 adaptation notes

The original `.agents` examples reference Yii 1 APIs such as
`Yii::app()->db`, `CDbConnection`, Yii 1 controllers and static response
helpers. These exact APIs must not be copied into Yii 3.

**Proposed Yii 3 adaptations:**

-   Use Yii 3 route definitions and controller/action conventions.
-   Use Yii 3 request and response services for HTTP input/output.
-   Obtain the configured Yii 3 database connection through dependency
    injection or the project's approved container configuration.
-   Use Yii 3-compatible database commands/query builder and parameter
    binding.
-   Keep the DAO contract of connection-first, scalar arguments after
    it.
-   Keep business transaction ownership in Core Services.
-   Use Yii 3-compatible exception classes and logging facilities.
-   Preserve the `.agents` response contract and inter-layer
    responsibilities.

Exact Yii 3 package names, interfaces, bootstrap wiring, route syntax
and dependency-injection definitions must be verified against the Yii 3
packages selected in `composer.json` before implementation.

## 6. Module-to-layer mapping

The module list below is a **candidate mapping** derived from the BBG
feature and database references. It is not final release-scope approval.

  -----------------------------------------------------------------------------------------------------------------------------------------
  Candidate module InDto                 Controller                 Versioned Services V1      Core Services            DAO
  ---------------- --------------------- -------------------------- -------------------------- ------------------------ -------------------
  Authentication   `AuthInDto`           `AuthController`           `AuthServicesV1`           `AuthServices`           `AuthDao`

  Users and        `UserInDto`           `UserController`           `UserServicesV1`           `UserServices`           `UserDao`
  identities                                                                                                            

  Tenants and      `TenantInDto`         `TenantController`         `TenantServicesV1`         `TenantServices`         `TenantDao`
  memberships                                                                                                           

  Business         `BusinessInDto`       `BusinessController`       `BusinessServicesV1`       `BusinessServices`       `BusinessDao`
  profiles                                                                                                              

  Catalogue and    `CatalogueInDto`      `CatalogueController`      `CatalogueServicesV1`      `CatalogueServices`      `CatalogueDao`
  products                                                                                                              

  Customers        `CustomerInDto`       `CustomerController`       `CustomerServicesV1`       `CustomerServices`       `CustomerDao`

  Enquiries and    `EnquiryInDto`        `EnquiryController`        `EnquiryServicesV1`        `EnquiryServices`        `EnquiryDao`
  messages                                                                                                              

  Orders and       `OrderInDto`          `OrderController`          `OrderServicesV1`          `OrderServices`          `OrderDao`
  fulfilment                                                                                                            

  Payments,        `PaymentInDto`        `PaymentController`        `PaymentServicesV1`        `PaymentServices`        `PaymentDao`
  refunds,                                                                                                              
  invoices                                                                                                              

  Plans and        `SubscriptionInDto`   `SubscriptionController`   `SubscriptionServicesV1`   `SubscriptionServices`   `SubscriptionDao`
  subscriptions                                                                                                         

  Promotions and   `PromotionInDto`      `PromotionController`      `PromotionServicesV1`      `PromotionServices`      `PromotionDao`
  engagement                                                                                                            

  Platform         `AdminInDto`          `AdminController`          `AdminServicesV1`          `AdminServices`          `AdminDao`
  administration                                                                                                        
  -----------------------------------------------------------------------------------------------------------------------------------------

### 6.1 Cross-cutting capabilities

These are responsibilities to be handled within the existing layers and
Yii plumbing, not automatically separate business layers:

-   Authentication middleware / request identity resolution.
-   Tenant context resolution.
-   Permission checks and role assignment validation.
-   Subscription entitlement checks.
-   Audit logging.
-   Notification dispatch integration, when delivery requirements are
    approved.
-   Provider verification and token exchange.
-   File/media storage integration, when a storage provider is selected.

A capability may be split into its own module later if the project owner
approves that boundary. Do not create modules merely to mirror every
database table.

### 6.2 Inventory and purchasing

The database reference explicitly classifies suppliers, purchase orders,
goods receipts, stores/stock locations, stock balances, stock movements,
FIFO cost layers, reservations, transfers and adjustments as **future
scope**.

Do not include operational inventory/purchasing endpoints, screens,
jobs, reports or active service workflows in the current backend build
without separate approval. The catalogue and sales baseline must
continue to function when inventory is disabled.

## 7. Layer responsibilities and implementation rules

### 7.1 InDto layer

**Source-derived responsibility:** Holds the module parameter array with
defaults and is used by Versioned Services.

Example shape:

``` php
<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Dto\In;

final class AuthInDto
{
    public array $authParam = [];
}
```

Rules:

-   One InDto class per API module.
-   Property follows `<moduleName>Param` camelCase naming.
-   The property is an array.
-   No business logic, database calls, authorization logic or
    sanitization in the DTO.
-   DTO validation beyond the structural mapping must follow the
    approved project validation approach; do not invent a new layer.

### 7.2 Controller layer

**Source-derived responsibility:** Receives the HTTP request and
forwards the expected input array to Versioned Services.

Rules:

-   Keep controller actions thin.
-   Enforce the agreed HTTP method for the endpoint. The `.agents`
    source requires POST for its original API actions; whether Yii 3
    endpoints retain POST-only semantics or use REST methods is a
    project-wide API decision still to be confirmed.
-   Map request input into the established module envelope.
-   Do not put business validation, business rules, SQL, DAO calls or
    transaction logic in controllers.
-   Do not trust client-supplied tenant identifiers or permission
    claims.
-   Do not treat Angular route guards as API security.
-   Use Yii 3 request/response mechanisms rather than Yii 1 controller
    APIs.

### 7.3 Versioned Services layer

**Source-derived responsibility:** Converts the input array to the
module InDto, invokes Core Services and returns the response.

Expected method naming:

-   `get<ModuleName>()`
-   `manage<ModuleName>()`

Rules:

-   Maintain version-specific API mapping here.
-   Construct or populate the correct InDto.
-   Pass the unwrapped `<moduleName>Param` array to Core Services.
-   Preserve the Core Services response contract.
-   Do not put database access or business workflows here.
-   Version changes should be explicit; do not silently break V1
    clients.

### 7.4 Core Services layer

This is the business execution layer in the supplied architecture.

**Level 1 --- dispatchers**

Expected method names:

-   `get<ModuleName>()`
-   `manage<ModuleName>()`

Responsibilities:

1.  Initialize `$resArr`.
2.  Validate that the module parameter is an array.
3.  Validate that `actionType` exists.
4.  Validate that `actionData` exists.
5.  Dispatch by `actionType` to the correct Level 2 worker.
6.  Return a failure response for unsupported action types.
7.  Preserve downstream messages and status.

**Level 2 --- workers**

Expected method names follow the entity:

-   `get<EntityName>()`
-   `manage<EntityName>()`

Responsibilities:

-   Validate the `actionData` structure.
-   Extract expected scalar values.
-   Apply business validation.
-   Resolve authenticated user, tenant and permission context from
    trusted server-side context.
-   Validate logical relationships and tenant ownership.
-   Enforce lifecycle transitions and subscription entitlements.
-   Own the transaction boundary for multi-step use cases.
-   Call DAO methods with the connection first and scalar arguments
    after it.
-   Call Utils for reusable non-business helpers.
-   Preserve DAO status and diagnostics.

Core Services must not accept a client-provided `tenant_id` as proof of
access. The tenant context must be derived from the authenticated
principal and verified membership/permission.

### 7.5 DAO layer

**Source-derived responsibility:** Performs database reads and writes
and returns the standard response map.

Method naming:

-   `get<EntityName>()`
-   `insert<EntityName>()`
-   `update<EntityName>()`

Rules:

-   First argument is the configured database connection.
-   All subsequent arguments are individual scalar values with defaults
    where appropriate.
-   Do not pass DTOs, arrays or arbitrary maps as DAO parameters.
-   DAO does not call Controllers or Core Services.
-   DAO does not own business workflows or transaction boundaries.
-   Use parameter binding / Yii 3 query builder. Never concatenate
    untrusted input into SQL.
-   Use explicit column lists; avoid `SELECT *` for normal list
    endpoints.
-   Apply `status = 'A'` to standard reads unless a specific authorized
    operation needs another status.
-   Use logical IDs and tenant scope passed from Core Services.
-   Return database results using the output contract.
-   Soft delete is an update of `status` from `A` to `Z`, not a physical
    delete in ordinary application workflows.
-   Keep reads outside write transaction blocks in accordance with the
    supplied `.agents` rules.

**Important Yii 3 note:** The original sample uses Yii 1 `quoteValue()`
patterns. New Yii 3 implementation must use Yii 3-supported parameter
binding or query-builder parameters. Do not mechanically copy the old
SQL construction examples.

### 7.6 Model layer

The `.agents` source explicitly says the Model layer is not used for new
development and is retained for legacy reference/maintenance.

Therefore:

-   Do not introduce Active Record as the default persistence approach.
-   Do not move DAO responsibilities into models.
-   Keep the directory/documentation only if useful for reference.
-   Any exception requires explicit architecture approval.

### 7.7 Utils layer

Utilities provide reusable helper functions that are not business
services and do not own database persistence.

Potential utilities, subject to implementation need:

-   JSON encoding/decoding helpers.
-   Date/time formatting and parsing.
-   Reusable primitive validation helpers.
-   Safe identifier/format helpers.
-   Non-business calculation helpers.

Do not place module-specific business rules, authorization decisions,
transaction workflows or SQL repositories in Utils.

## 8. Inter-layer request and response contract

### 8.1 Request envelope

The `.agents` convention uses a module parameter containing:

``` php
[
    'authParam' => [
        'actionType' => 'getUser',
        'actionData' => [
            // action-specific values
        ],
    ],
]
```

Versioned Services maps the module parameter to the InDto and passes the
unwrapped `authParam` array to Core Services.

### 8.2 Action naming

The supplied rules use action type values in the form:

-   `get<EntityName>`
-   `manage<EntityName>`

Examples for discussion:

-   `getUser`
-   `manageUser`
-   `getTenant`
-   `manageTenant`
-   `getProduct`
-   `manageProduct`
-   `getOrder`
-   `manageOrder`

The final action catalogue and exact payload schemas must be specified
per module before endpoint implementation.

### 8.3 Standard `$resArr` output contract

Every DAO and Core Services method returns an associative array with
exactly the standard contract fields:

``` php
$resArr = [
    'status' => 'FAILED', // SUCCESS | FAILED | EXCEPTION
    'msgArr' => [],
    'data' => [],
];
```

  -----------------------------------------------------------------------
  Field                               Rule
  ----------------------------------- -----------------------------------
  `status`                            `SUCCESS`, `FAILED` or `EXCEPTION`

  `msgArr`                            Flat array of diagnostic/message
                                      strings

  `data`                              Operation result; always an empty
                                      array for `FAILED` or `EXCEPTION`
  -----------------------------------------------------------------------

Expected `data` patterns from `.agents`:

  Operation            Successful data
  -------------------- -------------------------
  Insert               `['id' => inserted ID]`
  Update               `['id' => entity ID]`
  Get                  Array of row arrays
  Failed / Exception   `[]`

Rules:

-   Use `$resArr` as the return variable name.
-   Initialize it at the beginning of DAO and Core Services methods.
-   Do not return `null` or boolean in place of `data`.
-   `msgArr` remains a flat list of strings.
-   A calling layer must not swallow or reconstruct a downstream
    failure. Preserve status and data, and append useful diagnostic
    context where required by `.agents`.
-   Do not expose stack traces, SQL text, secrets, file paths or raw
    provider responses to public API clients. Internal logs may contain
    appropriately controlled diagnostics.

### 8.4 API envelope decision still pending

The `.agents` output contract is mandatory for DAO and Core Services.
Whether the public HTTP response should expose this exact structure
unchanged or wrap it in a separate API envelope is **pending**. Do not
change the `$resArr` contract while making that decision.

## 9. Authentication and session architecture

### 9.1 Current decision

**Confirmed direction:** BBG will use **short-lived access tokens with a
rotating refresh-token cookie**.

The authentication experience requested by the project owner includes:

-   Google sign-in.
-   Facebook sign-in.
-   Instagram sign-in, subject to provider feasibility for the intended
    account type and use case.

The word "OAuth" does not need to appear as a product login choice.
However, provider integrations use their supported underlying
authorization/identity protocols (such as OAuth 2.0 and OpenID Connect)
where applicable. Those protocols are not replaced by the token strategy
BBG uses for its own application sessions.

### 9.2 Token responsibilities

  -----------------------------------------------------------------------
  Item                                BBG direction
  ----------------------------------- -----------------------------------
  Access token                        Short-lived

  Access token client storage         Angular application memory; do not
                                      persist in localStorage

  Access token use                    Sent with protected API requests
                                      using the agreed authorization
                                      header

  Refresh token                       Longer-lived than the access token
                                      and rotated on successful refresh

  Refresh token storage               Secure, HttpOnly cookie

  Server-side session                 Track session and token family in
                                      `USER_SESSIONS` or the approved
                                      equivalent

  Stored refresh-token value          Store a cryptographic hash, not the
                                      raw token

  Logout                              Revoke the server-side
                                      session/token family and clear the
                                      cookie

  Refresh-token reuse                 Detect reuse and revoke the
                                      affected token family/session
  -----------------------------------------------------------------------

Exact access-token lifetime, refresh-token lifetime, signing
algorithm/key management, cookie domain/path, SameSite policy and
concurrent-device policy remain implementation decisions to document
before coding.

### 9.3 Sign-in flow

``` text
Angular sign-in
   |
   v
User chooses an enabled identity provider
   |
   v
Provider authentication / authorization
   |
   v
Angular returns provider result to the BBG authentication flow
   |
   v
Yii 3 Auth Controller
   |
   v
Auth Services V1
   |
   v
Auth Core Services
   |
   +--> Verify provider identity and required claims
   |
   +--> Find USER_IDENTITIES by provider + provider_subject
   |
   +--> Resolve or create BBG USERS account under approved registration rules
   |
   +--> Create BBG server-side session
   |
   +--> Store refresh-token hash and token-family/session metadata
   |
   v
Return short-lived access token
Set refresh token in Secure + HttpOnly cookie
```

The exact provider SDK/redirect/callback flow is provider-specific and
must be designed against the selected provider products.

### 9.4 Refresh flow

``` text
Angular detects expired/expiring access token
   |
   v
POST refresh endpoint (browser sends HttpOnly cookie)
   |
   v
Yii 3 Auth Controller
   |
   v
Auth Core Services
   |
   +--> Validate refresh token hash and session state
   |
   +--> Check expiry, revocation and token-family status
   |
   +--> Revoke/consume the presented refresh token
   |
   +--> Generate replacement refresh token
   |
   +--> Store replacement token hash
   |
   +--> Issue new short-lived access token
   |
   v
Return access token and set replacement HttpOnly cookie
```

The refresh-token rotation and old-token revocation must be atomic in
one Core Services transaction. This transaction boundary is also
identified in the database design.

### 9.5 Logout flow

1.  Angular calls the logout endpoint with the refresh cookie included.
2.  BBG identifies the corresponding server-side session/token family.
3.  Core Services revokes the session/token family.
4.  The response clears the refresh cookie using matching cookie
    attributes.
5.  Angular clears the in-memory access token and user session state.

### 9.6 Security requirements

-   Verify provider identity using the provider's supported server-side
    verification procedure.
-   Identify external accounts by `(provider, provider_subject)`, not by
    email alone.
-   Do not automatically merge accounts because two providers return the
    same email.
-   Account linking must require an authenticated BBG account and an
    explicit linking flow.
-   Do not store provider access tokens in plaintext. Retain provider
    tokens only if a separately approved provider API use case requires
    them; encrypt and scope them.
-   Do not accept tenant membership, role or platform-admin privilege
    from a provider claim or client payload.
-   Use CSRF protection for cookie-authenticated refresh/logout
    endpoints as appropriate to the final cookie and origin design.
-   Configure `Secure`, `HttpOnly`, `SameSite`, cookie path and domain
    deliberately for the deployment topology.
-   Rate-limit authentication, refresh and recovery endpoints.
-   Avoid leaking whether an email/account exists where that would
    create account-enumeration risk.
-   Keep secrets and signing keys outside source control.
-   Define key rotation and compromised-session revocation procedures
    before production.

### 9.7 Provider feasibility

  -----------------------------------------------------------------------
  Provider                Current status          Notes
  ----------------------- ----------------------- -----------------------
  Google                  Requested               Use Google's supported
                                                  identity sign-in flow;
                                                  validate issuer,
                                                  audience, signature and
                                                  required claims.

  Facebook                Requested               Select the appropriate
                                                  Meta Login product,
                                                  permissions and
                                                  production app review
                                                  requirements.

  Instagram               Requested; feasibility  Meta's Instagram APIs
                          pending                 have account-type and
                                                  use-case restrictions.
                                                  Do not promise general
                                                  personal Instagram
                                                  account sign-in until a
                                                  supported flow for this
                                                  exact use case is
                                                  verified.
  -----------------------------------------------------------------------

The database design v1.2 also lists LinkedIn as a requested provider in
its source notes. The latest explicit provider request for this backend
is Google, Facebook and Instagram. LinkedIn is therefore not included in
the confirmed provider list; confirm separately if it should remain
supported.

### 9.8 Authentication data structures

The database reference proposes:

-   `USERS`: global BBG user account.
-   `USER_IDENTITIES`: external provider identity mapping.
-   `USER_SESSIONS`: server-side session and refresh-token-family
    tracking.

Expected identity key:

``` text
(provider, provider_subject)
```

`provider_subject` is the immutable provider-side identifier. Email is
profile/contact information, not the external identity primary key.

The exact `USER_SESSIONS` fields, token-hash algorithm, expiry rules,
rotation/reuse fields and session revocation model must follow the
approved database design and security review.

## 10. Authorization, roles and multi-tenancy

### 10.1 Identity and tenant separation

-   A `USERS` record represents a global BBG person/account.
-   A tenant represents a business workspace.
-   A user may be a member of more than one tenant.
-   Tenant roles and permissions are scoped to the relevant tenant.
-   Platform administration is a separate privilege domain.
-   A public shopper does not need tenant membership merely to browse
    public storefront content.

### 10.2 Proposed authorization data structures

The database design proposes:

-   `ROLES`
-   `PERMISSIONS`
-   `ROLE_PERMISSIONS`
-   `USER_ROLE_ASSIGNMENTS`
-   `TENANTS`
-   `TENANT_MEMBERSHIPS`

These names and logical relationships are from the database reference.
Exact permission codes, role catalogue, platform-vs-tenant role
boundaries and assignment workflow still require approval.

### 10.3 Mandatory tenant-isolation rules

For every tenant-owned operation:

1.  Resolve the authenticated BBG user from the verified access token.
2.  Resolve the active tenant context from the request/session context
    using an approved selection mechanism.
3.  Verify the user's membership in that tenant.
4.  Verify the required permission for the requested operation.
5.  Scope every read, update, delete/soft-delete, count, export and
    report query to that tenant.
6.  Never trust a client-supplied `tenant_id` without server-side
    membership and permission validation.
7.  Do not expose another tenant's record by guessing or changing an ID.
8.  Apply the same isolation to pagination totals, exports, search,
    caches and aggregate queries.

### 10.4 Role switching

Role switching changes the user experience only. It does not grant
privileges. Every API action must independently check the user's
effective platform or tenant-scoped permissions.

Platform administrator access must never be assigned through public
registration or inferred from a provider identity.

## 11. Candidate module responsibilities

The following responsibilities are initial boundaries, not a final API
contract.

  -----------------------------------------------------------------------
  Module                              Candidate responsibilities
  ----------------------------------- -----------------------------------
  Auth                                Provider sign-in verification, BBG
                                      session creation, access-token
                                      issuance, refresh rotation, logout,
                                      identity linking

  User                                User profile, account status,
                                      identity mappings and user-level
                                      settings

  Tenant                              Tenant creation, tenant profile,
                                      membership and tenant context

  Business                            Business profile, public business
                                      details, verification/approval
                                      status

  Catalogue                           Categories, tenant product
                                      categories, products, variants,
                                      units, media, publication and
                                      storefront visibility

  Customer                            Customer identity, tenant-customer
                                      relationship, addresses and
                                      customer profile

  Enquiry                             Enquiry creation, tenant responses,
                                      message history and status
                                      transitions

  Order                               Order creation, items, snapshots,
                                      status history and fulfilment
                                      status

  Payment                             Payment records, transaction
                                      evidence, payment status, refunds
                                      and invoices

  Subscription                        Plans, entitlements, tenant
                                      subscriptions, payment proof and
                                      subscription lifecycle

  Promotion                           Promotional posts, media, likes,
                                      comments, views and content reports
                                      where approved

  Admin                               Platform-level user/business
                                      review, category administration,
                                      subscription oversight, moderation
                                      and platform analytics
  -----------------------------------------------------------------------

### 11.1 Shared catalogue rule

The product catalogue belongs to the tenant. The public storefront reads
the same tenant-owned product record; publication must not create a
duplicate public product record.

### 11.2 Subscription entitlements

Plan names and benefits should be data-driven. Enforce product limits,
feature access and module availability through entitlement records
rather than hard-coded checks against tier names.

The feature reference describes Silver, Gold and Platinum tiers as a
functional baseline. The database design proposes plans and
entitlements. Exact plan pricing, limits, benefits, approval states and
renewal rules require product approval.

### 11.3 Orders and payment truth

-   Preserve product, price, tax, customer and address snapshots needed
    for historical orders/documents.
-   A displayed QR code or uploaded payment proof is not proof of
    confirmed payment.
-   Reconcile payment evidence and record explicit payment-status
    transitions.
-   Refund approval and payment/order status recalculation must be
    atomic at the service layer.
-   Real payment-gateway integration is listed as future enhancement /
    pending provider selection.

### 11.4 Customer identity

The database design proposes a hybrid model:

-   `CUSTOMER_IDENTITIES`: possible global customer identity, optionally
    linked to `USERS`.
-   `TENANT_CUSTOMERS`: tenant-specific customer relationship.
-   `CUSTOMER_ADDRESSES`: customer addresses.

The exact relationship between customer identities and authenticated
users remains pending confirmation. Guest enquiry and guest checkout
rules also remain pending.

## 12. Database access and data conventions

Follow `BBG_Database_Design_v1.2.md` and the supplied `.agents` database
conventions. The following is a summary for backend implementation
planning.

### 12.1 Naming

  -----------------------------------------------------------------------
  Database object                     Convention
  ----------------------------------- -----------------------------------
  Database/table names                `UPPERCASE_SNAKE_CASE`

  Column names                        `lowercase_snake_case`

  Primary key                         `id INT UNSIGNED AUTO_INCREMENT`

  Logical ID references               `INT UNSIGNED` unless a source
                                      table specifies otherwise
  -----------------------------------------------------------------------

### 12.2 Mandatory common columns

Every table in the database design is specified to include these five
columns:

  ---------------------------------------------------------------------------------------------------------------------------
  Column                  Definition                                                                  Meaning
  ----------------------- --------------------------------------------------------------------------- -----------------------
  `status`                `VARCHAR(1) NOT NULL DEFAULT 'A'`                                           `A` active; `Z` soft
                                                                                                      deleted

  `created_by`            `INT UNSIGNED NULL`                                                         Creating user/system
                                                                                                      actor

  `created_on`            `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`                               Creation time

  `updated_by`            `INT UNSIGNED NULL`                                                         Last updating
                                                                                                      user/system actor

  `updated_on`            `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`   Last update time
  ---------------------------------------------------------------------------------------------------------------------------

Do not omit any of the five common columns from a table defined by the
approved database specification.

### 12.3 Relationship and deletion conventions

-   The supplied database design specifies no physical foreign keys;
    relationships are logical ID references validated in Core Services.
-   Add indexes for logical relationship IDs and query patterns.
-   Standard reads exclude `status = 'Z'`.
-   Soft delete changes `status` from `A` to `Z`.
-   Restore changes `Z` to `A` only with appropriate permission.
-   Do not physically delete records in ordinary business workflows.
-   Lifecycle states such as `order_status`, `payment_status`,
    `approval_status` and `publication_status` are separate from the
    universal `status` column.
-   Do not soft-delete posted financial or stock-ledger records; use
    reversal/correction records.

### 12.4 Financial values

The database reference retains the selected `DOUBLE(10,2)` convention
and explicitly notes floating-point approximation risk. Backend
calculations, comparisons, rounding and reconciliation must be designed
to manage that risk. Do not silently replace the selected type with
`DECIMAL`; any change requires explicit approval.

### 12.5 Query performance

-   Filter by tenant and active status before counting and paginating.
-   Select only required columns for list endpoints.
-   Avoid `SELECT *` in ordinary list queries.
-   Use indexes based on real filter, join, sort and uniqueness
    patterns.
-   Avoid N+1 query patterns.
-   Use aggregate SQL for totals and dashboards where appropriate.
-   Set a maximum page size.
-   Use ordinary offset pagination for normal lists; evaluate cursor
    pagination for very large or frequently changing datasets.
-   Use batch processing or streamed/async processing for large exports.
-   Apply tenant isolation to list totals, exports, caches and reports.

## 13. Transactions and consistency

Transaction boundaries belong to Core Services, not DAO.

The database design and `.agents` rules identify the following
operations as service-level atomic workflows:

  -----------------------------------------------------------------------
  Workflow                            Atomic operations
  ----------------------------------- -----------------------------------
  Refresh-token rotation              Validate/consume old token, revoke
                                      old token, create replacement
                                      token/session state

  Order confirmation/payment          Confirm order, record payment
  allocation                          allocation and recalculate relevant
                                      status

  Refund                              Approve refund, record refund
                                      transaction and recalculate
                                      payment/order status

  Goods receipt (future scope)        Post receipt, create movement and
                                      FIFO cost layer, update balance

  Stock adjustment (future scope)     Post adjustment, create movement
                                      and update balance

  Stock transfer (future scope)       Dispatch/receive, paired movements
                                      and balance updates

  FIFO consumption (future scope)     Allocate oldest eligible layers,
                                      update remaining quantities and
                                      stock balance
  -----------------------------------------------------------------------

Rules:

-   Core Services starts, commits or rolls back the transaction.
-   DAO receives the active connection and executes the individual
    database operation.
-   Keep reads outside DAO transaction blocks as required by the
    `.agents` source; perform necessary precondition reads in the
    service flow before the write transaction where appropriate.
-   On failure, roll back the whole use case and return the established
    failure/exception response.
-   Do not report success if any required step in the atomic workflow
    failed.
-   Never rewrite posted financial or stock history; use
    reversal/compensating records.

## 14. API design conventions and pending contract decisions

### 14.1 Existing architecture conventions

The `.agents` architecture uses:

-   Module-specific Controller actions.
-   `get<ModuleName>` and `manage<ModuleName>` Versioned Services
    methods.
-   `get<ModuleName>` and `manage<ModuleName>` Core Services Level 1
    dispatchers.
-   `get<EntityName>` and `manage<EntityName>` Level 2 workers.
-   `get<EntityName>`, `insert<EntityName>` and `update<EntityName>` DAO
    methods.
-   `actionType` and `actionData` in the module parameter envelope.

These conventions should be preserved unless the project owner approves
a documented change.

### 14.2 Decisions still pending

  -----------------------------------------------------------------------
  Decision                            Current state
  ----------------------------------- -----------------------------------
  HTTP method policy                  `.agents` source requires POST for
                                      all original API actions; confirm
                                      whether Yii 3 API keeps POST-only
                                      or adopts REST methods

  Public API response envelope        DAO/Core `$resArr` fixed; HTTP
                                      envelope/wrapper pending

  API pagination/filter/sort contract Pending

  Exact route naming and URL          Pending
  structure                           

  Exact actionType catalogue and      Pending per module
  payload schema                      

  API error/status-to-HTTP mapping    Pending

  Idempotency requirements for        Pending
  order/payment operations            

  Rate limits per endpoint and role   Pending

  Public guest access rules           Pending

  Guest checkout/enquiry              Pending
  -----------------------------------------------------------------------

Do not invent endpoint names, payloads, status codes or pagination
fields as finalized contracts.

## 15. Security baseline

Backend security is enforced server-side. Frontend hiding, guards and
role switching are not security controls.

Minimum requirements:

-   Verify access-token signature and claims on protected endpoints.
-   Enforce token expiry, issuer, audience and approved signing-key
    policy.
-   Protect refresh-token cookie endpoints against CSRF according to the
    selected cookie/origin design.
-   Rotate refresh tokens and detect reuse.
-   Revoke sessions on logout and approved security events.
-   Enforce tenant membership and permission checks on every
    tenant-owned operation.
-   Keep platform-admin permissions separate from tenant roles.
-   Validate logical record ownership and relationship consistency in
    Core Services.
-   Use parameterized SQL / query builder.
-   Keep secrets out of Git and client responses.
-   Do not expose SQL errors, stack traces, filesystem paths, tokens or
    secret configuration.
-   Apply rate limits to sign-in, refresh, public enquiry and other
    abuse-prone endpoints.
-   Validate uploaded file type, size and access policy when media
    upload is implemented.
-   Log security-relevant events without logging raw credentials or
    tokens.
-   Define audit-log coverage and retention before production.

## 16. Testing strategy

The following test groups are proposed for the backend. Exact tooling
and coverage thresholds remain pending.

### 16.1 Unit tests

-   Core Services Level 1 envelope validation and action dispatch.
-   Level 2 business validation and lifecycle rules.
-   Tenant membership and permission checks.
-   Subscription entitlement checks.
-   Token expiry, rotation, revocation and reuse detection.
-   Utility behaviour.

### 16.2 DAO/integration tests

-   Insert, get and update operations.
-   Parameter binding and query correctness.
-   Active/soft-deleted filtering.
-   Tenant-scoped queries.
-   Unique constraints and duplicate handling.
-   Transaction rollback on partial failure.
-   Session/token-family persistence.

### 16.3 API tests

-   Authentication success and failure.
-   Expired access token behaviour.
-   Refresh rotation and replay/reuse behaviour.
-   Logout revocation.
-   Public storefront access.
-   Cross-tenant access denial.
-   Permission denial for unauthorized operations.
-   Order/payment lifecycle and idempotency once those contracts are
    approved.

### 16.4 Security tests

-   IDOR / guessed-ID access attempts.
-   Tenant ID tampering.
-   Role escalation attempts.
-   Provider identity collision/account-linking cases.
-   CSRF on cookie-authenticated endpoints.
-   Refresh-token replay.
-   Rate-limit behaviour.
-   Sensitive data leakage in errors/logs.

## 17. Release scope boundaries

### 17.1 Candidate Phase 1 capabilities

The feature and database references suggest these as candidates, subject
to explicit scope approval:

-   Authentication and user accounts.
-   Tenants, memberships and authorization.
-   Business profiles and approval.
-   Categories and product catalogue.
-   Public storefront and business discovery.
-   Customers and customer relationships.
-   Enquiries and responses.
-   Orders and order status.
-   Payment records, proof and invoice capabilities as approved.
-   Plans, subscriptions and entitlements.
-   Promotions and marketplace engagement.
-   Expenses/cash capabilities if included in the approved first-release
    scope.
-   Platform administration and moderation.
-   Reports/dashboard capabilities defined for the release.

The exact Phase 1 module/table subset is not finalized by this document.

### 17.2 Explicit future scope

The database reference classifies the following as future scope:

-   Suppliers.
-   Purchase orders and purchase order items.
-   Goods receipts and receipt items.
-   Stores and stock locations.
-   Stock balances and stock movements.
-   FIFO cost layers and allocations.
-   Stock reservations.
-   Stock transfers and transfer items.
-   Stock adjustments and adjustment items.

Do not implement or operationalize these capabilities in the current
release without separate approval. Catalogue and sales must work while
inventory is disabled.

Other features listed as future or not fully specified in the supplied
references include real payment-gateway integration, email/SMS/push
delivery providers, reviews/ratings, advanced location-based discovery,
wishlist, bulk ordering, full offline write/sync and detailed
tax/compliance rules.

## 18. Open decisions before implementation

  -------------------------------------------------------------------------------
                            \# Decision                     Current state /
                                                            required action
  ---------------------------- ---------------------------- ---------------------
                             1 Social providers             Google and Facebook
                                                            requested; Instagram
                                                            feasibility must be
                                                            verified for intended
                                                            account type;
                                                            LinkedIn appears in
                                                            DB notes but is not
                                                            in latest explicit
                                                            provider request

                             2 Access-token lifetime        Short-lived
                                                            confirmed; exact
                                                            duration pending

                             3 Refresh-token lifetime       Rotating cookie
                                                            confirmed; exact
                                                            duration pending

                             4 Token format/signing keys    Pending security
                                                            design

                             5 Cookie configuration         Secure HttpOnly
                                                            cookie confirmed in
                                                            direction; SameSite,
                                                            domain, path and CSRF
                                                            details pending

                             6 Multi-device sessions        Pending

                             7 Provider account linking     Explicit safe linking
                                                            flow required;
                                                            detailed UX pending

                             8 Tenant role/permission       Pending
                               catalogue                    

                             9 Platform-admin role model    Separate privilege
                                                            domain required;
                                                            exact catalogue
                                                            pending

                            10 Customer identity model      Hybrid proposal in
                                                            database design; user
                                                            confirmation pending

                            11 Guest enquiry / guest        Pending
                               checkout                     

                            12 Phase 1 module/table subset  Pending scope
                                                            approval

                            13 HTTP method policy           POST-only source
                                                            convention vs REST
                                                            methods pending

                            14 API                          Pending
                               response/pagination/filter   
                               contract                     

                            15 Payment gateway              Provider-neutral
                                                            records proposed;
                                                            gateway selection
                                                            future

                            16 Tax/invoice requirements     Pending

                            17 Media/file storage provider  Pending

                            18 Notification providers       Pending

                            19 Yii 3 package and DI wiring  Must be verified
                                                            against actual
                                                            Composer dependencies

                            20 Test framework and coverage  Pending
                               thresholds                   
  -------------------------------------------------------------------------------

## 19. Implementation sequence --- proposed

This is a suggested order of work, not authorization to begin coding.

1.  Review and approve this backend architecture.
2.  Confirm the Phase 1 module and database-table subset.
3.  Finalize authentication provider feasibility and token/session
    security details.
4.  Confirm tenant, platform-admin and customer identity rules.
5.  Confirm API conventions: routes, methods, action types, payloads,
    response envelope, pagination and HTTP status mapping.
6.  Verify the actual Yii 3 Composer packages and configure framework
    plumbing.
7.  Implement shared foundations while retaining the seven `.agents`
    layers.
8.  Implement authentication and tenant/authorization foundations.
9.  Implement approved business modules in dependency order.
10. Add tests at each layer and cross-tenant/security integration tests.
11. Review database migrations against `BBG_Database_Design_v1.2.md`
    before any schema creation.
12. Prepare deployment/security configuration separately from local
    development.

## 20. Source references and precedence

This specification is based on the following supplied resources:

1.  **`.agents.zip`**
    -   `.agents/skills/new-dev/resources/Architecture.md`
    -   `.agents/skills/new-dev/Rules.md`
    -   `.agents/skills/new-dev/examples/`
    -   `.agents/skills/db-design/SKILL.md`
    -   The seven-layer architecture and inter-layer rules are retained
        as the primary backend architecture source.
2.  **`BBG_Database_Design_v1.2.md`**
    -   Logical database design, naming, universal columns, table
        catalogue, relationship rules, tenant isolation, transaction
        boundaries, future-scope inventory classification and pending
        decisions.
    -   This is a proposed logical schema, not evidence that migrations
        or tables exist.
3.  **`BBG Marketplace - Complete Features & Functionality List`**
    -   Marketplace roles and workflows, consumer/business/admin
        features, catalogue, promotions, enquiries, orders and feature
        reference.
    -   Its original Manus authentication and prototype stack are not
        adopted as BBG's backend stack or authentication decision.
4.  **`dark_store_frontend_detailed_report_v1.0.md`**
    -   Product experience boundaries, Angular 22 integration context,
        tenant-aware frontend requirements and frontend/backend contract
        dependencies.

### Source precedence

-   `.agents.zip` controls the seven-layer architecture and its
    responsibilities.
-   `BBG_Database_Design_v1.2.md` controls the current logical database
    conventions and proposed data dictionary.
-   The feature list and frontend report inform product capabilities and
    client integration.
-   Confirmed project-owner decisions in the current project discussion
    update older source proposals where explicitly stated (for example,
    BBG naming and the short-lived access-token + rotating
    refresh-token-cookie direction).
-   Any conflict or unresolved item must be surfaced for approval; do
    not silently replace source conventions.

------------------------------------------------------------------------

## Appendix A --- Backend architecture quick reference

``` text
Angular 22
   |
Nginx
   |
PHP-FPM / PHP 8.4
   |
Yii 3 routing + middleware
   |
1. InDto
   |
2. Controller
   |
3. Versioned Services V1
   |
4. Core Services
      Level 1: get/manage module dispatcher
      Level 2: get/manage entity worker
      Owns business validation and transactions
   |
5. DAO
      Connection first, scalar arguments after
      Parameterized database operations
   |
MySQL 8.4

6. Model: retained for reference; not used for new development
7. Utils: reusable helpers, no business workflow or DAO responsibility
```

**Authentication summary:** Google/Facebook sign-in requested; Instagram
feasibility pending. BBG issues a short-lived access token and a
rotating refresh token in a Secure, HttpOnly cookie. The server tracks
sessions/token families and stores refresh-token hashes, not raw refresh
tokens. Exact lifetimes and cookie/security parameters remain pending.
