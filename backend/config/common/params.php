<?php

declare(strict_types=1);

use Yiisoft\Db\Mysql\Dsn;

return [
    'application' => require __DIR__ . '/application.php',
    'yiisoft/aliases' => [
        'aliases' => require __DIR__ . '/aliases.php',
    ],
    'yiisoft/db-mysql' => [
        'dsn' => new Dsn(
            'mysql',
            getenv('DB_HOST') ?: 'mysql',
            getenv('DB_NAME') ?: 'bbg',
            getenv('DB_PORT') ?: '3306',
            ['charset' => 'utf8mb4'],
        ),
        'username' => getenv('DB_USER') ?: '',
        'password' => getenv('DB_PASSWORD') ?: '',
    ],
];
