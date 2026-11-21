path: `protected/services/implementations/<ModuleName>Services.php`
```php
class <ModuleName>Services implements I<ModuleName>Services {

    // ---------- First level: switch on actionType ----------

    public static function get<ModuleName>($<moduleName>Param) {

        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data'   => array()
        );

        if (!is_array($<moduleName>Param)) {
            $msg = "Invalid input for get<ModuleName>: expected array, got " . gettype($<moduleName>Param);
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.<ModuleName>Services.get<ModuleName>');
            $resArr['msgArr'][] = $msg;
            return $resArr;
        }

        if (!isset($<moduleName>Param['actionType'])) {
            $msg = "Missing required key 'actionType' in get<ModuleName> input";
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.<ModuleName>Services.get<ModuleName>');
            $resArr['msgArr'][] = $msg;
            return $resArr;
        }

        if (!isset($<moduleName>Param['actionData'])) {
            $msg = "Missing required key 'actionData' in get<ModuleName> input";
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.<ModuleName>Services.get<ModuleName>');
            $resArr['msgArr'][] = $msg;
            return $resArr;
        }

        $actionType = $<moduleName>Param['actionType'];
        $actionData = $<moduleName>Param['actionData'];

        switch ($actionType) {
            case 'get<EntityName>':
                $resArr = <ModuleName>Services::get<EntityName>($actionData);
                break;

            default:
                $msg = "Unsupported actionType '{$actionType}' for get<ModuleName>";
                Yii::log($msg, CLogger::LEVEL_ERROR, 'application.<ModuleName>Services.get<ModuleName>');
                $resArr['msgArr'][] = $msg;
                break;
        }

        return $resArr;
    }

    public static function manage<ModuleName>($<moduleName>Param) {

        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data'   => array()
        );

        if (!is_array($<moduleName>Param)) {
            $msg = "Invalid input for manage<ModuleName>: expected array, got " . gettype($<moduleName>Param);
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.<ModuleName>Services.manage<ModuleName>');
            $resArr['msgArr'][] = $msg;
            return $resArr;
        }

        if (!isset($<moduleName>Param['actionType'])) {
            $msg = "Missing required key 'actionType' in manage<ModuleName> input";
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.<ModuleName>Services.manage<ModuleName>');
            $resArr['msgArr'][] = $msg;
            return $resArr;
        }

        if (!isset($<moduleName>Param['actionData'])) {
            $msg = "Missing required key 'actionData' in manage<ModuleName> input";
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.<ModuleName>Services.manage<ModuleName>');
            $resArr['msgArr'][] = $msg;
            return $resArr;
        }

        $actionType = $<moduleName>Param['actionType'];
        $actionData = $<moduleName>Param['actionData'];

        switch ($actionType) {
            case 'manage<EntityName>':
                $resArr = <ModuleName>Services::manage<EntityName>($actionData);
                break;

            default:
                $msg = "Unsupported actionType '{$actionType}' for manage<ModuleName>";
                Yii::log($msg, CLogger::LEVEL_ERROR, 'application.<ModuleName>Services.manage<ModuleName>');
                $resArr['msgArr'][] = $msg;
                break;
        }

        return $resArr;
    }

    // ---------- Second level: one function per actionType ----------

    public static function get<EntityName>($actionData) {

        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data'   => array()
        );

        if (!is_array($actionData)) {
            $msg = "Invalid input for <ModuleName>Services::get<EntityName>: expected array, got " . gettype($actionData);
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.services.<ModuleName>Services');
            $resArr['msgArr'][] = $msg;
            return $resArr;
        }

        $<entityName>Id     = array_key_exists('<entityName>Id', $actionData)     ? $actionData['<entityName>Id']     : '';
        $<entityName>Code   = array_key_exists('<entityName>Code', $actionData)   ? $actionData['<entityName>Code']   : '';
        $<entityName>Status = array_key_exists('<entityName>Status', $actionData) ? $actionData['<entityName>Status'] : '';

        try {
            $connection = Yii::app()->db;

            $resArr = <ModuleName>Dao::get<EntityName>(
                $connection,
                $<entityName>Id,
                $<entityName>Code,
                $<entityName>Status
            );

            if ($resArr['status'] !== 'SUCCESS') {
                $msg = 'Failed in <ModuleName>Services::get<EntityName>: DAO did not return SUCCESS';
                Yii::log($msg, CLogger::LEVEL_ERROR, 'application.services.<ModuleName>Services');
                $resArr['msgArr'][] = $msg;
            }
        } catch (Exception $e) {
            $msg = 'Exception in <ModuleName>Services::get<EntityName>: ' . $e->getMessage();
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.services.<ModuleName>Services');

            $resArr = array(
                'status' => 'EXCEPTION',
                'msgArr' => array($msg),
                'data'   => array()
            );
        }

        return $resArr;
    }

    public static function manage<EntityName>($actionData) {

        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data'   => array()
        );

        if (!is_array($actionData)) {
            $msg = "Invalid input for <ModuleName>Services::manage<EntityName>: expected array, got " . gettype($actionData);
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.services.<ModuleName>Services');
            $resArr['msgArr'][] = $msg;
            return $resArr;
        }

        $<entityName>Id          = array_key_exists('<entityName>Id', $actionData)          ? $actionData['<entityName>Id']          : '';
        $<entityName>Name        = array_key_exists('<entityName>Name', $actionData)        ? $actionData['<entityName>Name']        : '';
        $<entityName>Code        = array_key_exists('<entityName>Code', $actionData)        ? $actionData['<entityName>Code']        : '';
        $<entityName>Description = array_key_exists('<entityName>Description', $actionData) ? $actionData['<entityName>Description'] : '';
        $<entityName>CreatedBy   = array_key_exists('<entityName>CreatedBy', $actionData)   ? $actionData['<entityName>CreatedBy']   : '';
        $<entityName>UpdatedBy   = array_key_exists('<entityName>UpdatedBy', $actionData)   ? $actionData['<entityName>UpdatedBy']   : '';
        $<entityName>Status      = array_key_exists('<entityName>Status', $actionData)      ? $actionData['<entityName>Status']      : '';

        $isUpdate = ($<entityName>Id !== '' && $<entityName>Id !== null);
        $action   = $isUpdate ? 'update' : 'insert';

        try {
            $connection = Yii::app()->db;

            if ($isUpdate) {
                $resArr = <ModuleName>Dao::update<EntityName>(
                    $connection,
                    $<entityName>Id,
                    $<entityName>Name,
                    $<entityName>Code,
                    $<entityName>Description,
                    $<entityName>UpdatedBy,
                    $<entityName>Status
                );
            } else {
                $resArr = <ModuleName>Dao::insert<EntityName>(
                    $connection,
                    $<entityName>Name,
                    $<entityName>Code,
                    $<entityName>Description,
                    $<entityName>CreatedBy,
                    $<entityName>UpdatedBy
                );
            }

            if ($resArr['status'] !== 'SUCCESS') {
                $msg = "Failed in <ModuleName>Services::manage<EntityName> ({$action}): DAO did not return SUCCESS";
                Yii::log($msg, CLogger::LEVEL_ERROR, 'application.services.<ModuleName>Services');
                $resArr['msgArr'][] = $msg;
            }
        } catch (Exception $e) {
            $msg = "Exception in <ModuleName>Services::manage<EntityName> ({$action}): " . $e->getMessage();
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.services.<ModuleName>Services');
            $resArr = array(
                'status' => 'EXCEPTION',
                'msgArr' => array($msg),
                'data'   => array()
            );
        }

        return $resArr;
    }
}
```

path: `protected/services/interfaces/I<ModuleName>Services.php`
```php
interface I<ModuleName>Services {
    public static function get<ModuleName>($<moduleName>Param);
    public static function manage<ModuleName>($<moduleName>Param);
}
```
