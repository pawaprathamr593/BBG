<?php

declare(strict_types=1);

namespace App\Utils;

use InvalidArgumentException;
use ReflectionClass;

final class InDtoObjectFactory
{
    public static function create(string $dtoClass, array $input): object
    {
        if (!class_exists($dtoClass)) {
            throw new InvalidArgumentException('Requested InDto class does not exist.');
        }

        $reflection = new ReflectionClass($dtoClass);
        $dto = $reflection->newInstance();
        $properties = $reflection->getProperties();

        foreach ($properties as $property) {
            $name = $property->getName();
            if (!str_ends_with($name, 'Param')) {
                continue;
            }

            $value = $input[$name] ?? [];
            if (!is_array($value)) {
                throw new InvalidArgumentException('Module input parameter must be an array.');
            }
            $property->setValue($dto, $value);
            return $dto;
        }

        throw new InvalidArgumentException('InDto must expose one module parameter array.');
    }
}
