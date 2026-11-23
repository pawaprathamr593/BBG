<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Dao\AdminDao;
use App\Services\IAuthServices;
use App\Services\Implementations\AdminServices;
use App\Utils\AwsS3Storage;
use Codeception\Test\Unit;
use DateTimeImmutable;
use DateTimeZone;
use Psr\Log\NullLogger;
use Yiisoft\Db\Connection\ConnectionInterface;

final class SubscriptionValidityTest extends Unit
{
    private AdminServices $service;

    protected function setUp(): void
    {
        parent::setUp();
        $ref = new \ReflectionClass(AdminServices::class);
        $this->service = $ref->newInstanceWithoutConstructor();
    }

    public function testMonthlyBillingCycleCalendarArithmetic(): void
    {
        // Standard addition
        $start = new DateTimeImmutable('2026-05-15 10:30:00', new DateTimeZone('UTC'));
        $end = $this->service->calculateSubscriptionEnd($start, 'MONTHLY');
        self::assertSame('2026-06-15 10:30:00', $end->format('Y-m-d H:i:s'));

        // Month-end leap year: Jan 31 -> Feb 29 (2024 is leap year)
        $startLeap = new DateTimeImmutable('2024-01-31 14:00:00', new DateTimeZone('UTC'));
        $endLeap = $this->service->calculateSubscriptionEnd($startLeap, 'MONTHLY');
        self::assertSame('2024-02-29 14:00:00', $endLeap->format('Y-m-d H:i:s'));

        // Month-end non-leap year: Jan 31 -> Feb 28 (2026 is non-leap year)
        $startNonLeap = new DateTimeImmutable('2026-01-31 14:00:00', new DateTimeZone('UTC'));
        $endNonLeap = $this->service->calculateSubscriptionEnd($startNonLeap, 'MONTHLY');
        self::assertSame('2026-02-28 14:00:00', $endNonLeap->format('Y-m-d H:i:s'));

        // 31-day month to 30-day month: March 31 -> April 30
        $startMar = new DateTimeImmutable('2026-03-31 08:15:00', new DateTimeZone('UTC'));
        $endApr = $this->service->calculateSubscriptionEnd($startMar, 'MONTHLY');
        self::assertSame('2026-04-30 08:15:00', $endApr->format('Y-m-d H:i:s'));
    }

    public function testQuarterlyBillingCycle(): void
    {
        $start = new DateTimeImmutable('2026-11-23 16:00:00', new DateTimeZone('UTC'));
        $end = $this->service->calculateSubscriptionEnd($start, 'QUARTERLY');
        self::assertSame('2027-02-23 16:00:00', $end->format('Y-m-d H:i:s'));

        // Quarter ending in Feb: Nov 30 -> Feb 28
        $startNov = new DateTimeImmutable('2026-11-30 12:00:00', new DateTimeZone('UTC'));
        $endFeb = $this->service->calculateSubscriptionEnd($startNov, 'QUARTERLY');
        self::assertSame('2027-02-28 12:00:00', $endFeb->format('Y-m-d H:i:s'));
    }

    public function testHalfYearlyBillingCycle(): void
    {
        $start = new DateTimeImmutable('2026-08-31 09:00:00', new DateTimeZone('UTC'));
        $end = $this->service->calculateSubscriptionEnd($start, 'HALF_YEARLY');
        self::assertSame('2027-02-28 09:00:00', $end->format('Y-m-d H:i:s'));
    }

    public function testYearlyBillingCycle(): void
    {
        $start = new DateTimeImmutable('2026-11-23 12:00:00', new DateTimeZone('UTC'));
        $end = $this->service->calculateSubscriptionEnd($start, 'YEARLY');
        self::assertSame('2027-11-23 12:00:00', $end->format('Y-m-d H:i:s'));

        // Leap year: Feb 29, 2024 -> Feb 28, 2025
        $startLeap = new DateTimeImmutable('2024-02-29 15:30:00', new DateTimeZone('UTC'));
        $endLeap = $this->service->calculateSubscriptionEnd($startLeap, 'YEARLY');
        self::assertSame('2025-02-28 15:30:00', $endLeap->format('Y-m-d H:i:s'));
    }
}
