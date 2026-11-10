# BBG backend layer boundaries

The BBG backend preserves the exact seven logical layers from the supplied .agents architecture. The target Yii 3 directory mapping is documented here; these directories are architectural scaffolding only and do not represent approved feature modules.

| Layer | Target directory | Responsibility |
|---|---|---|
| InDto | src/Modules/Api/V1/Dto/In | Module input parameter arrays and defaults; no business logic |
| Controller | src/Modules/Api/V1/Controllers | HTTP endpoint and forwarding the expected input envelope |
| Versioned Services | src/Modules/Api/V1/Services | Convert input arrays into InDto, invoke Core Services, return API response |
| Core Services | src/Services | Validate action envelope, dispatch use cases, apply business rules, own transactions |
| DAO | src/Dao | Database reads/writes with supplied connection and scalar arguments |
| Model | src/Models | Retained/reference layer; not used for new development under supplied .agents rules |
| Utils | src/Utils | Reusable technical helpers, not business services or database access |

Yii 3 routing, middleware, DI, HTTP request/response, database connection, and bootstrap are framework plumbing, not additional business layers.

Core Services own business invariants, authorization, tenant scoping, business validation, and transaction boundaries. DAO performs parameterized persistence. Do not replace these boundaries with a generic Controller-Service-Repository pattern.

Apply the documented A/Z soft-delete convention, preserve the five common audit fields and exact SQL types, and validate logical references in Core Services. Do not add physical foreign keys contrary to the supplied database design.

No module endpoints, payloads, response envelopes, permissions, status catalogues, or business workflows are finalized here. Candidate modules are not release approval. Supplier, inventory, purchase, stock, and FIFO features remain out of scope pending separate approval. No migrations or database objects are part of this foundation.
