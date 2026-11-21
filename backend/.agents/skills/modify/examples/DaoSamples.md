path: `protected/dao/<ModuleName>Dao.php`
```php
<?php

class <ModuleName>Dao {

    // Insert. $connection is the Yii CDbConnection passed by the core services layer.
    public static function insert<EntityName>(
        $connection,
        $<entityName>Name        = '',
        $<entityName>Code        = '',
        $<entityName>Description = '',
        $<entityName>CreatedBy   = '',
        $<entityName>UpdatedBy   = ''
    ) {
        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data'   => array()
        );

        try {
            if ($<entityName>Name === '' || $<entityName>Name === null) {
                $msg = 'Missing required field: <entityName>Name';
                Yii::log('<ModuleName>Dao::insert<EntityName>: ' . $msg, CLogger::LEVEL_ERROR, 'application.dao.<ModuleName>Dao');
                $resArr['msgArr'][] = $msg;
                return $resArr;
            }

            if ($<entityName>Code === '' || $<entityName>Code === null) {
                $msg = 'Missing required field: <entityName>Code';
                Yii::log('<ModuleName>Dao::insert<EntityName>: ' . $msg, CLogger::LEVEL_ERROR, 'application.dao.<ModuleName>Dao');
                $resArr['msgArr'][] = $msg;
                return $resArr;
            }

            if ($<entityName>CreatedBy === '' || $<entityName>CreatedBy === null) {
                $msg = 'Missing required field: <entityName>CreatedBy';
                Yii::log('<ModuleName>Dao::insert<EntityName>: ' . $msg, CLogger::LEVEL_ERROR, 'application.dao.<ModuleName>Dao');
                $resArr['msgArr'][] = $msg;
                return $resArr;
            }

            $columns = array();
            $values  = array();

            if ($<entityName>Name !== '' && $<entityName>Name !== null) {
                $columns[] = 'name';
                $values[]  = $connection->quoteValue($<entityName>Name);
            }

            if ($<entityName>Code !== '' && $<entityName>Code !== null) {
                $columns[] = 'code';
                $values[]  = $connection->quoteValue($<entityName>Code);
            }

            if ($<entityName>Description !== '' && $<entityName>Description !== null) {
                $columns[] = 'description';
                $values[]  = $connection->quoteValue($<entityName>Description);
            }

            if ($<entityName>CreatedBy !== '' && $<entityName>CreatedBy !== null) {
                $columns[] = 'created_by';
                $values[]  = $connection->quoteValue($<entityName>CreatedBy);
            }

            if ($<entityName>UpdatedBy !== '' && $<entityName>UpdatedBy !== null) {
                $columns[] = 'updated_by';
                $values[]  = $connection->quoteValue($<entityName>UpdatedBy);
            }

            $sql = "INSERT INTO <TABLE_NAME> ("
                 . implode(', ', $columns)
                 . ") VALUES ("
                 . implode(', ', $values)
                 . ")";

            $connection->createCommand($sql)->execute();

            $resArr['status']   = 'SUCCESS';
            $resArr['msgArr'][] = '<EntityName> inserted successfully';
            $resArr['data']     = array('id' => $connection->getLastInsertID());

        } catch (Exception $e) {
            $msg = '<ModuleName>Dao::insert<EntityName>: ' . $e->getMessage();
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.dao.<ModuleName>Dao');
            $resArr = array(
                'status' => 'EXCEPTION',
                'msgArr' => array($msg),
                'data'   => array()
            );
        }

        return $resArr;
    }


    // Update.
    public static function update<EntityName>(
        $connection,
        $<entityName>Id          = '',
        $<entityName>Name        = '',
        $<entityName>Code        = '',
        $<entityName>Description = '',
        $<entityName>UpdatedBy   = '',
        $<entityName>Status      = ''
    ) {
        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data'   => array()
        );

        try {
            if ($<entityName>Id === '' || $<entityName>Id === null) {
                $msg = 'Missing required field: <entityName>Id';
                Yii::log('<ModuleName>Dao::update<EntityName>: ' . $msg, CLogger::LEVEL_ERROR, 'application.dao.<ModuleName>Dao');
                $resArr['msgArr'][] = $msg;
                return $resArr;
            }

            $setArr = array();

            if ($<entityName>Name !== '' && $<entityName>Name !== null) {
                $setArr[] = 'name = ' . $connection->quoteValue($<entityName>Name);
            }

            if ($<entityName>Code !== '' && $<entityName>Code !== null) {
                $setArr[] = 'code = ' . $connection->quoteValue($<entityName>Code);
            }

            if ($<entityName>Description !== '' && $<entityName>Description !== null) {
                $setArr[] = 'description = ' . $connection->quoteValue($<entityName>Description);
            }

            if ($<entityName>UpdatedBy !== '' && $<entityName>UpdatedBy !== null) {
                $setArr[] = 'updated_by = ' . $connection->quoteValue($<entityName>UpdatedBy);
            }

            if ($<entityName>Status !== '' && $<entityName>Status !== null) {
                $setArr[] = 'status = ' . $connection->quoteValue($<entityName>Status);
            }

            if (empty($setArr)) {
                $msg = 'No fields provided for update';
                Yii::log('<ModuleName>Dao::update<EntityName>: ' . $msg, CLogger::LEVEL_ERROR, 'application.dao.<ModuleName>Dao');
                $resArr['msgArr'][] = $msg;
                return $resArr;
            }

            $sql = "UPDATE <TABLE_NAME> SET "
                 . implode(', ', $setArr)
                 . " WHERE id = " . $connection->quoteValue($<entityName>Id);

            $connection->createCommand($sql)->execute();

            $resArr['status']   = 'SUCCESS';
            $resArr['msgArr'][] = '<EntityName> updated successfully';
            $resArr['data']     = array('id' => $<entityName>Id);

        } catch (Exception $e) {
            $msg = '<ModuleName>Dao::update<EntityName>: ' . $e->getMessage();
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.dao.<ModuleName>Dao');
            $resArr = array(
                'status' => 'EXCEPTION',
                'msgArr' => array($msg),
                'data'   => array()
            );
        }

        return $resArr;
    }


    // Get.
    public static function get<EntityName>(
        $connection,
        $<entityName>Id     = '',
        $<entityName>Code   = '',
        $<entityName>Status = ''
    ) {
        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data'   => array()
        );

        try {
            $whereArr = array();

            if ($<entityName>Id !== '' && $<entityName>Id !== null) {
                $whereArr[] = 'id = ' . $connection->quoteValue($<entityName>Id);
            }

            if ($<entityName>Code !== '' && $<entityName>Code !== null) {
                $whereArr[] = 'code = ' . $connection->quoteValue($<entityName>Code);
            }

            if ($<entityName>Status !== '' && $<entityName>Status !== null) {
                $whereArr[] = 'status = ' . $connection->quoteValue($<entityName>Status);
            }

            $sql = "SELECT
                        COALESCE(id, '')          AS id,
                        COALESCE(name, '')        AS name,
                        COALESCE(code, '')        AS code,
                        COALESCE(description, '') AS description,
                        COALESCE(created_by, '')  AS created_by,
                        COALESCE(created_on, '')  AS created_on,
                        COALESCE(updated_by, '')  AS updated_by,
                        COALESCE(updated_on, '')  AS updated_on,
                        COALESCE(status, '')      AS status
                    FROM <TABLE_NAME>";

            if (!empty($whereArr)) {
                $sql .= " WHERE " . implode(' AND ', $whereArr);
            }

            $sql .= " ORDER BY id DESC";

            $rows = $connection->createCommand($sql)->queryAll();

            $resArr['status']   = 'SUCCESS';
            $resArr['msgArr'][] = '<EntityName> fetched successfully';
            $resArr['data']     = $rows;

        } catch (Exception $e) {
            $msg = '<ModuleName>Dao::get<EntityName>: ' . $e->getMessage();
            Yii::log($msg, CLogger::LEVEL_ERROR, 'application.dao.<ModuleName>Dao');
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
