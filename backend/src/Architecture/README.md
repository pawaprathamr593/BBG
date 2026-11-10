# BBG backend layer boundaries

| Layer | Responsibility |
|---|---|
| InDto | Request input normalization and input-level validation |
| Controller | HTTP boundary and orchestration hand-off; no business rules |
| Versioned Services | Version-specific application/API orchestration |
| Core Services | Business rules, authorization, tenant isolation, validation, transactions |
| DAO | Parameterized persistence operations; no business policy |
| Model | Retained/reference model structures; confirm intended usage before new classes |
| Utils | Small shared technical utilities without business workflows |

Core Services own business invariants, permission checks, tenant scoping, and transaction boundaries. DAO performs parameterized persistence. Do not replace these boundaries with a generic Controller-Service-Repository pattern.

Apply the documented A/Z soft-delete convention, preserve the five common audit fields and exact SQL types, and validate logical references in Core Services. Do not add physical foreign keys contrary to the supplied database design.

No API routes, payloads, response envelopes, permissions, status catalogues, or business workflows are finalized here. Supplier, inventory, purchase, stock, and FIFO features remain out of scope pending separate approval. This is architecture documentation only; no migrations are included.
