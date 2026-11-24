<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class DashboardDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getConsumerSummary(ConnectionInterface $db, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT
            (SELECT COUNT(*) FROM ORDERS o
                INNER JOIN TENANT_CUSTOMERS tc ON tc.id = o.tenant_customer_id AND tc.status = 'A'
                INNER JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id AND ci.status = 'A'
                WHERE ci.user_id = :orders_user AND o.status = 'A') AS total_orders,
            (SELECT COUNT(*) FROM ORDERS o
                INNER JOIN TENANT_CUSTOMERS tc ON tc.id = o.tenant_customer_id AND tc.status = 'A'
                INNER JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id AND ci.status = 'A'
                WHERE ci.user_id = :active_orders_user AND o.order_status IN ('PLACED', 'REQUESTED')
                    AND o.status = 'A') AS active_orders,
            (SELECT COUNT(*) FROM ORDERS o
                INNER JOIN TENANT_CUSTOMERS tc ON tc.id = o.tenant_customer_id AND tc.status = 'A'
                INNER JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id AND ci.status = 'A'
                WHERE ci.user_id = :paid_orders_user AND o.payment_status = 'PAID' AND o.status = 'A') AS paid_orders,
            (SELECT COUNT(*) FROM CUSTOMER_ENQUIRIES e
                INNER JOIN CUSTOMER_IDENTITIES ci ON ci.id = e.customer_identity_id AND ci.status = 'A'
                WHERE ci.user_id = :enquiries_user AND e.enquiry_status IN ('PENDING', 'RESPONDED')
                    AND e.status = 'A') AS open_enquiries",
            [':orders_user' => $userId, ':active_orders_user' => $userId,
             ':paid_orders_user' => $userId, ':enquiries_user' => $userId], 'getConsumerSummary');
    }

    public function getEntrepreneurSummary(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT
            (SELECT COUNT(*) FROM PRODUCTS WHERE tenant_id = :products_tenant AND status = 'A') AS total_products,
            (SELECT COUNT(*) FROM PROMOTIONAL_POSTS WHERE tenant_id = :promotions_tenant
                AND publication_status = 'PUBLISHED' AND status = 'A') AS published_promotions,
            (SELECT COUNT(*) FROM ORDERS WHERE tenant_id = :orders_tenant
                AND order_status IN ('PLACED', 'REQUESTED') AND status = 'A') AS pending_orders,
            (SELECT COUNT(*) FROM CUSTOMER_ENQUIRIES WHERE tenant_id = :enquiries_tenant
                AND enquiry_status IN ('PENDING', 'RESPONDED') AND status = 'A') AS open_enquiries,
            (SELECT COUNT(*) FROM TENANT_SUBSCRIPTIONS WHERE tenant_id = :subscriptions_tenant
                AND subscription_status = 'ACTIVE' AND status = 'A'
                AND (starts_on IS NULL OR starts_on <= CURRENT_TIMESTAMP)
                AND (ends_on IS NULL OR DATE_ADD(ends_on, INTERVAL 2 DAY) >= CURRENT_TIMESTAMP)) AS active_subscriptions,
            (SELECT p.plan_name FROM TENANT_SUBSCRIPTIONS ts
                INNER JOIN PLANS p ON p.id = ts.plan_id AND p.status = 'A'
                WHERE ts.tenant_id = :plan_tenant AND ts.subscription_status = 'ACTIVE' AND ts.status = 'A'
                    AND (ts.starts_on IS NULL OR ts.starts_on <= CURRENT_TIMESTAMP)
                    AND (ts.ends_on IS NULL OR DATE_ADD(ts.ends_on, INTERVAL 2 DAY) >= CURRENT_TIMESTAMP)
                ORDER BY ts.starts_on DESC, ts.id DESC LIMIT 1) AS current_plan",
            [':products_tenant' => $tenantId, ':promotions_tenant' => $tenantId,
             ':orders_tenant' => $tenantId, ':enquiries_tenant' => $tenantId,
             ':subscriptions_tenant' => $tenantId, ':plan_tenant' => $tenantId], 'getEntrepreneurSummary');
    }

    private function one(ConnectionInterface $db, string $sql, array $params, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $row = $db->createCommand($sql, $params)->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logger->error('DashboardDao::' . $operation . ' failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Dashboard data operation failed.';
            $resArr['data'] = [];
        }
        return $resArr;
    }
}
