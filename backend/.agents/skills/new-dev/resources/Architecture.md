# Project Architecture

> **Purpose (new-dev):** These are the prescriptive standards for new development. Always follow this document, even if existing code elsewhere deviates from it.

- Root directory is `./sims.git/`(sym link), SIMS (Student Information Management System)[Path: `/home/de/projwww/sims.git`].
- `sims.git/` has the SIMS RESTful API:
    - path: `./sims-services/digitalsims/`
    - framework: Yii 1.1.14
    - **active development happens here**
    - New development should be compatible with the best PHP version supported by Yii 1.1.14.

# Output Contract

- PHP map, with fields:
    - `"status"`: Overall outcome of the operation, with one of the following values:
        - `"SUCCESS"`: Operation completed successfully
        - `"FAILED"`: Validation failed or the requested operation could not be completed
        - `"EXCEPTION"`: An unexpected exception occurred during execution
    - `"msgArr"`: Developer diagnostic and execution messages
    - `"data"`: Result of the operation; depends on the function. will be empty array in case of failure or exception.
- This contract applies to every DAO and core services function.

# `sims.git/sims-services/digitalsims/` Directory Structure

- InDto layer
    - path: `protected/modules/api/modules/v1/dto/in`
    - file naming: `<module_name>InDto.php`, Pascal case.
    - role: Has the InDto for the module, with all fields set to default values, used by the versioned services layer.
    - structure: It is a PHP class with `public $<module_name>Param = array()`, a variable named in camelCase.

- Controller layer
    - path: `protected/modules/api/modules/v1/controllers/`
    - file naming: `<module_name>Controller.php`, Pascal case.
    - role: Sends the input PHP array to the respective versioned services function for that method using `$this->_inDtoArray`. `_inDtoArray` is a PHP map with `["<module_name>Param" => ["actionType" => "<action_name>", "actionData" => <data_payload>]]`.
    - note: No input sanitization is performed at this layer.

- Versioned services layer
    - path: `protected/modules/api/modules/v1/services/implementations`
    - interface: `protected/modules/api/modules/v1/services/interfaces`
    - file naming: `<module_name>ServicesV1.php`, Pascal case.
    - role: Converts the input PHP array into an InDto object using `InDtoObjectFactory::create(<module_inDto_class_name_string>, $inDtoArr)`, which maps the `<module_name>Param` key into an object with a `<module_name>Param` field — the internal structure remains the same. It then passes the `<module_name>Param` array of this InDto (e.g. `$mshpInDto->mshpParam`) to the core services layer and receives a PHP array response, which is converted to JSON via `ComponentsJson::GenerateJsonAndSend($outDto)`.

- Core services layer
    - path: `protected/services/implementations`
    - interface: `protected/services/interfaces`
    - file naming: `<module_name>Services.php`, Pascal case.
    - role: Takes the `<module_name>Param` array (holding `actionType` and `actionData`) from the versioned services layer and processes the request. At the first level, it switches on `actionType` and calls the corresponding second-level core service function.
    - The second level creates the DB connection (Yii `CDbConnection`) and may call functions in DAO(s) or util(s), passing `$connection` (DAO only) followed by scalars as arguments.
    - exception handling: Exceptions are handled at the level where they occur. The calling layer above checks the returned response's `status`; if it indicates an error, that layer returns the same response upward with an appended message for easier debugging (rather than swallowing or reconstructing it).
    - Returns the response according to the Output Contract.

- DAO layer
    - path: `protected/dao/`
    - file naming: `<module_name>Dao.php`, Pascal case.
    - role: Takes `$connection` (the Yii `CDbConnection` from created by the core services layer) as its first argument, followed by scalars. It then reads from or writes to the concerned DB, and returns according to the Output Contract. There are three types of operations:
        - **Get**: standard data retrieval.
        - **Insert**: creates a new row.
        - **Update**: updates an existing row, and also handles delete as a soft delete.

- Model layer
    - path: `protected/models/`
    - file naming: `<table_name>.php`
    - role: Takes scalars as input, then reads from or upserts the concerned DB.
    - status: Not used in new development. Retained for updates to older code, and as structural reference documenting older development — i.e., where to find what.

- Utils layer
    - path: `protected/utils/`
    - file naming: `<utility>.php`
    - role: Has utility functions.

# Rules

- DB name and table names will Caps snake case
- column names will be small snake case
- for DAO layer if there are transactions keep the reads(SELECT) out of it and the rollbacks will be in service layers.
- use `$resArr` name for the return value variable;
