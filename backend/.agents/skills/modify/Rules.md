# Architecture Rules & Coding Conventions

Compressed specification of intra-layer, inter-layer, argument, output, and naming conventions replicated from the reference architecture.

---

## 1. Universal Standards

### 1.1 Output Contract (`$resArr`)
- **Return Type**: Associative array returned by every Core Services and DAO method.
- **Variable Name**: Strictly `$resArr`.
- **Initialization**: Must initialize at function start:
  `$resArr = array('status' => 'FAILED', 'msgArr' => array(), 'data' => array());`
- **Allowed Statuses**:
  - `'SUCCESS'`: Operation completed successfully.
  - `'FAILED'`: Validation error, unsupported action, or downstream non-success.
  - `'EXCEPTION'`: Caught runtime/database exception.
- **`data` Payload**:
  - Insert: `array('id' => $connection->getLastInsertID())`
  - Update: `array('id' => $<entityName>Id)`
  - Get: `$rows` (array of row arrays from `queryAll()`)
  - Failed / Exception: Always `array()`, never `null` or boolean.
- **`msgArr` Array**: Flat list of strings. Append via `$resArr['msgArr'][] = $msg;`.

### 1.2 Variable & Symbol Naming

| Symbol | Case / Pattern | Example |
| :--- | :--- | :--- |
| Module Class | PascalCase | `<ModuleName>Controller`, `<ModuleName>ServicesV1`, `<ModuleName>Services`, `<ModuleName>Dao`, `<ModuleName>InDto` |
| Module Interface | `I` + PascalCase | `I<ModuleName>ServicesV1`, `I<ModuleName>Services` |
| Module Parameter | camelCase + `Param` | `$<moduleName>Param` (e.g. `$mshpParam`) |
| InDto Instance | camelCase + `InDto` | `$<moduleName>InDto` (e.g. `$mshpInDto`) |
| Entity Variables | camelCase (`$<entityName><Field>`) | `$<entityName>Id`, `$<entityName>Name`, `$<entityName>Code`, `$<entityName>Status` |
| Database Tables | `UPPERCASE_SNAKE_CASE` | `MSHP_TOPICS`, `MSHP_GRADESCALES` |
| Database Columns | `lowercase_snake_case` | `id`, `name`, `code`, `description`, `created_by`, `created_on`, `updated_by`, `updated_on`, `status` |
| Action Type Key | camelCase string | `'get<EntityName>'`, `'manage<EntityName>'` |
| Controller Action | `action` + Verb + `<ModuleName>` | `actionGet<ModuleName>()`, `actionManage<ModuleName>()` |
| ServicesV1 Methods | Verb + `<ModuleName>` | `get<ModuleName>()`, `manage<ModuleName>()` |
| Core Services L1 | Verb + `<ModuleName>` | `get<ModuleName>()`, `manage<ModuleName>()` |
| Core Services L2 | Verb + `<EntityName>` | `get<EntityName>()`, `manage<EntityName>()` |
| DAO Methods | Operation + `<EntityName>` | `get<EntityName>()`, `insert<EntityName>()`, `update<EntityName>()` |

### 1.3 Error Logging & Categories
- Log call: `Yii::log($msg, CLogger::LEVEL_ERROR, '<Category>');`
- **Core Services L1 Category**: `'application.<ModuleName>Services.<methodName>'` (e.g. `'application.MshpServices.getMshp'`)
- **Core Services L2 Category**: `'application.services.<ModuleName>Services'`
- **DAO Layer Category**: `'application.dao.<ModuleName>Dao'`

---

## 2. Inter-Layer Conventions

```
Client (HTTP POST JSON)
  └── Controller::action[Get|Manage]<ModuleName>()
        └── [Passes $this->_inDtoArray]
        └── <ModuleName>ServicesV1::[get|manage]<ModuleName>()
              └── InDtoObjectFactory::create('<ModuleName>InDto', $inDtoArray)
              └── [Passes $<moduleName>InDto-><moduleName>Param]
              └── <ModuleName>Services::[get|manage]<ModuleName>() (Level 1)
                    └── [Validates envelope, switches on actionType, passes $actionData]
                    └── <ModuleName>Services::[get|manage]<EntityName>() (Level 2)
                          └── $connection = Yii::app()->db;
                          └── [Passes $connection, followed strictly by scalar values]
                          └── <ModuleName>Dao::[get|insert|update]<EntityName>()
                                └── [Returns $resArr]
```

### Protocol Rules:
1. **Controller $\rightarrow$ ServicesV1**:
   - HTTP method guard: `if (ComponentsHttp::httpMethod() == 'POST')` strictly required for ALL requests (reads and writes).
   - Calls static `<ModuleName>ServicesV1::<method>($this->_inDtoArray)`.
   - Controller returns nothing; ServicesV1 terminates and emits JSON.
2. **ServicesV1 $\rightarrow$ Core Services**:
   - Converts input using `$<moduleName>InDto = InDtoObjectFactory::create('<ModuleName>InDto', $inDtoArray);`.
   - Passes **only** unwrapped array `$<moduleName>InDto-><moduleName>Param` to `<ModuleName>Services::<method>()`.
   - Captures `$resArr` and immediately invokes `ComponentsJson::GenerateJsonAndSend($resArr);`.
3. **Core Services L1 $\rightarrow$ Core Services L2**:
   - Extracts `$actionType = $<moduleName>Param['actionType'];` and `$actionData = $<moduleName>Param['actionData'];`.
   - Dispatches via `switch ($actionType)` to `<ModuleName>Services::<actionType>($actionData)`.
4. **Core Services L2 $\rightarrow$ DAO**:
   - Creates DB connection: `$connection = Yii::app()->db;`.
   - Calls `<ModuleName>Dao::<methodName>($connection, $scalar1, $scalar2, ...)`.
   - **DAO Argument Rule**: 1st argument is strictly `$connection`. All subsequent arguments must be individual scalars with default values. Never pass arrays, maps, or DTOs.
   - Status Check: If `$resArr['status'] !== 'SUCCESS'`, logs error and appends diagnostic text to `$resArr['msgArr'][]` (preserves downstream DAO messages).
5. **Exception Propagation**:
   - DAO and Core Services L2 wrap execution in `try-catch (Exception $e)`.
   - On exception: log to appropriate category, set `'status' => 'EXCEPTION'`, set `'msgArr' => array($msg)`, set `'data' => array()`, and return `$resArr`.
   - No unhandled exceptions bubble across layer boundaries.

---

## 3. Intra-Layer Conventions

### 3.1 InDto Layer (`dto/in/<ModuleName>InDto.php`)
- Extends `BaseInDto`.
- Declares a single public array property: `public $<moduleName>Param = array();`.
- No methods, logic, or other properties.

### 3.2 Controller Layer (`controllers/<ModuleName>Controller.php`)
- Extends `V1Controller`.
- Action names: `actionGet<ModuleName>()` and `actionManage<ModuleName>()`.
- Verifies POST method via `ComponentsHttp::httpMethod() == 'POST'`.
- Directly invokes `<ModuleName>ServicesV1::<method>($this->_inDtoArray)`.
- No validation, sanitization, business logic, or return statements.

### 3.3 Versioned Services Layer (`ServicesV1.php` & `IServicesV1.php`)
- Class `<ModuleName>ServicesV1` implements `I<ModuleName>ServicesV1`.
- All methods are `public static`: `get<ModuleName>($inDtoArray)` and `manage<ModuleName>($inDtoArray)`.
- Interface `I<ModuleName>ServicesV1` declares both static methods.
- Method steps:
  1. Factory build InDto: `$<moduleName>InDto = InDtoObjectFactory::create('<ModuleName>InDto', $inDtoArray);`
  2. Call Core Services: `$resArr = <ModuleName>Services::<method>($<moduleName>InDto-><moduleName>Param);`
  3. Send response: `ComponentsJson::GenerateJsonAndSend($resArr);`

### 3.4 Core Services Layer (`Services.php` & `IServices.php`)
- Class `<ModuleName>Services` implements `I<ModuleName>Services`.
- Interface `I<ModuleName>Services` declares **only** Level 1 dispatchers (`get<ModuleName>`, `manage<ModuleName>`).

#### Level 1: Dispatchers (`get<ModuleName>`, `manage<ModuleName>`)
- Input: `$<moduleName>Param` (array).
- Validations (each fails with error log, appended `msgArr`, and immediate return of `$resArr`):
  1. `!is_array($<moduleName>Param)`
  2. `!isset($<moduleName>Param['actionType'])`
  3. `!isset($<moduleName>Param['actionData'])`
- Routing: `switch ($actionType)` calls corresponding Level 2 worker.
- `default`: Logs unsupported `actionType`, appends to `msgArr`, returns `$resArr`.

#### Level 2: Workers (`get<EntityName>`, `manage<EntityName>`)
- Input: `$actionData` (array).
- Validations:
  1. `!is_array($actionData)` $\rightarrow$ log, append `msgArr`, return `$resArr`.
- Parameter Extraction:
  `$<entityName><Field> = array_key_exists('<entityName><Field>', $actionData) ? $actionData['<entityName><Field>'] : '';`
- In `manage<EntityName>`:
  - Branching check: `$isUpdate = ($<entityName>Id !== '' && $<entityName>Id !== null);`
  - Mode flag: `$action = $isUpdate ? 'update' : 'insert';`
- Execution:
  - Wrapped in `try-catch (Exception $e)`.
  - `$connection = Yii::app()->db;`
  - Calls DAO method with `$connection` + scalars.
  - Verifies `$resArr['status'] === 'SUCCESS'`; if not, logs error and appends failure notice to `msgArr`.

### 3.5 DAO Layer (`<ModuleName>Dao.php`)
- Class `<ModuleName>Dao`. All methods `public static`.
- Signatures: First argument is `$connection`, followed by scalar arguments with default `''`:
  - `insert<EntityName>($connection, $<entityName>Name = '', $<entityName>Code = '', ...)`
  - `update<EntityName>($connection, $<entityName>Id = '', $<entityName>Name = '', ...)`
  - `get<EntityName>($connection, $<entityName>Id = '', $<entityName>Code = '', $<entityName>Status = '')`
- Entire method body wrapped in `try-catch (Exception $e)`.

#### DAO Operation Rules:
1. **Mandatory Field Validation**:
   - Check `$<param> === '' || $<param> === null` $\rightarrow$ log error, append message, return `$resArr`.
   - Update requires `$<entityName>Id`; Insert requires entity mandatory fields (e.g. Name, Code, CreatedBy).
2. **Escaping & Quoting**:
   - Never interpolate raw variables into SQL.
   - Always escape values: `$connection->quoteValue($<param>)`.
3. **Insert Logic**:
   - Dynamically build `$columns = array()` and `$values = array()`.
   - Check `$val !== '' && $val !== null` before adding column and quoted value.
   - SQL: `"INSERT INTO <TABLE_NAME> (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ")"`.
   - Execute: `$connection->createCommand($sql)->execute();`.
   - Success: `'status' => 'SUCCESS'`, `'data' => array('id' => $connection->getLastInsertID())`.
4. **Update / Soft-Delete Logic**:
   - Dynamically build `$setArr = array()`.
   - For each non-empty field: `$setArr[] = 'column_name = ' . $connection->quoteValue($val);`.
   - If `empty($setArr)`: log "No fields provided for update", append to `msgArr`, return `$resArr`.
   - SQL: `"UPDATE <TABLE_NAME> SET " . implode(', ', $setArr) . " WHERE id = " . $connection->quoteValue($<entityName>Id)`.
   - Execute: `$connection->createCommand($sql)->execute();`.
   - Success: `'status' => 'SUCCESS'`, `'data' => array('id' => $<entityName>Id)`.
   - Soft-delete is implemented as an update setting `status` to inactive.
5. **Get Logic**:
   - Dynamically build `$whereArr = array()`.
   - For each non-empty filter: `$whereArr[] = 'column_name = ' . $connection->quoteValue($val);`.
   - **COALESCE Rule**: Every column in `SELECT` must use `COALESCE(column_name, '') AS column_name` to prevent nulls in output.
   - Always append `ORDER BY id DESC`.
   - Execute: `$rows = $connection->createCommand($sql)->queryAll();`.
   - Success: `'status' => 'SUCCESS'`, `'data' => $rows`.

---

## 4. Responsibility Matrix

| Layer | Responsibility | Input | Output | Logging Category |
| :--- | :--- | :--- | :--- | :--- |
| **InDto** | Parameter schema holder | N/A | Class property array | N/A |
| **Controller** | HTTP method guard & delegation | `$this->_inDtoArray` | Emits JSON via ServicesV1 | N/A |
| **ServicesV1** | InDto creation & JSON serialization | `$inDtoArray` | JSON to client | N/A |
| **Core Services (L1)** | Payload validation & action routing | `$<moduleName>Param` | `$resArr` | `'application.<ModuleName>Services.<method>'` |
| **Core Services (L2)** | Extraction, DB connection, DAO call | `$actionData` | `$resArr` | `'application.services.<ModuleName>Services'` |
| **DAO** | Field validation, SQL building & DB execution | `$connection` + scalars | `$resArr` | `'application.dao.<ModuleName>Dao'` |
