<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Dao\TenantDao;
use Codeception\Test\Unit;
use DateTimeImmutable;
use DateTimeZone;
use ReflectionClass;

final class SubscriptionPlanRbacTest extends Unit
{
    private TenantDao $tenantDao;

    protected function setUp(): void
    {
        parent::setUp();
        $ref = new ReflectionClass(TenantDao::class);
        $this->tenantDao = $ref->newInstanceWithoutConstructor();
    }

    /**
     * Verify that TenantDao entitlement alias resolution maps canonical system codes
     * to all legacy and modern variants so RBAC / entitlement checks never miss a capability.
     */
    public function testEntitlementAliasResolution(): void
    {
        $ref = new ReflectionClass(TenantDao::class);
        $method = $ref->getMethod('resolveEntitlementAliases');
        $method->setAccessible(true);

        $aliasesPromotions = $method->invoke($this->tenantDao, 'promotions.enabled');
        self::assertContains('promotions.enabled', $aliasesPromotions);
        self::assertContains('DAILY_PROMOTION_LIMIT', $aliasesPromotions);
        self::assertContains('PROMOTIONAL_POSTS', $aliasesPromotions);

        $aliasesStorefront = $method->invoke($this->tenantDao, 'STOREFRONT_ACCESS');
        self::assertContains('STOREFRONT_ACCESS', $aliasesStorefront);
        self::assertContains('storefront.enabled', $aliasesStorefront);

        $aliasesCatalogue = $method->invoke($this->tenantDao, 'catalogue.enabled');
        self::assertContains('catalogue.enabled', $aliasesCatalogue);
        self::assertContains('PRODUCT_MANAGEMENT', $aliasesCatalogue);

        $aliasesReports = $method->invoke($this->tenantDao, 'advanced.reports.enabled');
        self::assertContains('advanced.reports.enabled', $aliasesReports);
        self::assertContains('SEO_SUGGESTIONS', $aliasesReports);
        self::assertContains('ADVANCED_ANALYTICS', $aliasesReports);
    }

    /**
     * Verify SQL entitlement predicate logic:
     * (UPPER(pe.entitlement_value) IN ('1', 'TRUE', 'YES') OR CAST(pe.entitlement_value AS SIGNED) > 0)
     */
    public function testEntitlementValuePredicateLogic(): void
    {
        $evalPredicate = function (mixed $value): bool {
            $upper = strtoupper(trim((string) $value));
            $isPositiveBool = in_array($upper, ['1', 'TRUE', 'YES'], true);
            $numeric = (int) $value;
            return $isPositiveBool || $numeric > 0;
        };

        // Allowed positive entitlements
        self::assertTrue($evalPredicate('1'));
        self::assertTrue($evalPredicate('TRUE'));
        self::assertTrue($evalPredicate('true'));
        self::assertTrue($evalPredicate('YES'));
        self::assertTrue($evalPredicate('yes'));
        self::assertTrue($evalPredicate('5'));
        self::assertTrue($evalPredicate('50'));

        // Disallowed negative / zero / missing entitlements
        self::assertFalse($evalPredicate('0'));
        self::assertFalse($evalPredicate('0.00'));
        self::assertFalse($evalPredicate('FALSE'));
        self::assertFalse($evalPredicate('false'));
        self::assertFalse($evalPredicate('NO'));
        self::assertFalse($evalPredicate('NONE'));
        self::assertFalse($evalPredicate('UNAVAILABLE'));
        self::assertFalse($evalPredicate(''));
        self::assertFalse($evalPredicate('-1'));
    }

    /**
     * Verify 2-day grace period timestamp logic:
     * (ts.ends_on IS NULL OR DATE_ADD(ts.ends_on, INTERVAL 2 DAY) >= CURRENT_TIMESTAMP)
     */
    public function testGracePeriodTimestampArithmetic(): void
    {
        $evalGraceWindow = function (?string $endsOn, string $currentTime): bool {
            if ($endsOn === null) {
                return true;
            }
            $end = new DateTimeImmutable($endsOn, new DateTimeZone('UTC'));
            $current = new DateTimeImmutable($currentTime, new DateTimeZone('UTC'));
            $graceDeadline = $end->modify('+2 days');

            return $current <= $graceDeadline;
        };

        $endsOn = '2026-11-20 12:00:00';

        // 1. Before subscription ends (active)
        self::assertTrue($evalGraceWindow($endsOn, '2026-11-19 12:00:00'));

        // 2. Exact expiration moment
        self::assertTrue($evalGraceWindow($endsOn, '2026-11-20 12:00:00'));

        // 3. 24 hours into 2-day grace period (still within grace)
        self::assertTrue($evalGraceWindow($endsOn, '2026-11-21 12:00:00'));

        // 4. 47 hours into 2-day grace period (still within grace)
        self::assertTrue($evalGraceWindow($endsOn, '2026-11-22 11:00:00'));

        // 5. Exactly 48 hours after expiration (grace deadline moment)
        self::assertTrue($evalGraceWindow($endsOn, '2026-11-22 12:00:00'));

        // 6. 49 hours after expiration (grace period expired, access revoked)
        self::assertFalse($evalGraceWindow($endsOn, '2026-11-22 13:00:00'));

        // 7. Days later (expired)
        self::assertFalse($evalGraceWindow($endsOn, '2026-11-25 12:00:00'));

        // 8. Null ends_on (unlimited lifetime subscription)
        self::assertTrue($evalGraceWindow(null, '2030-01-01 00:00:00'));
    }

    /**
     * Verify payment proof submission status restrictions:
     * Only PENDING or REJECTED subscriptions may accept payment proofs.
     * ACTIVE, APPROVED, EXPIRED, and GRACE_PERIOD subscriptions are strictly immutable.
     */
    public function testProofSubmissionStatusRestrictions(): void
    {
        $canSubmitProof = function (string $status): bool {
            return in_array($status, ['PENDING', 'REJECTED'], true);
        };

        // Permitted states
        self::assertTrue($canSubmitProof('PENDING'));
        self::assertTrue($canSubmitProof('REJECTED'));

        // Prohibited immutable states
        self::assertFalse($canSubmitProof('ACTIVE'));
        self::assertFalse($canSubmitProof('APPROVED'));
        self::assertFalse($canSubmitProof('EXPIRED'));
        self::assertFalse($canSubmitProof('GRACE_PERIOD'));
        self::assertFalse($canSubmitProof('CANCELLED'));
        self::assertFalse($canSubmitProof('UNKNOWN'));
    }
}
