<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class OrderDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getCustomerOrders(ConnectionInterface $db, int $userId, ?int $tenantId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $tenantFilter = $tenantId === null ? '' : ' AND o.tenant_id = :tenant_id';
        $params = [':user_id' => $userId, ':limit' => $limit, ':offset' => $offset];
        if ($tenantId !== null) {
            $params[':tenant_id'] = $tenantId;
        }
        return $this->many($db, "SELECT o.id, o.tenant_id, o.order_number, o.order_channel,
            o.order_status, o.payment_status, o.fulfilment_status, o.ordered_on,
            o.subtotal, o.tax_amount, o.grand_total, t.default_currency, bp.business_name
            FROM ORDERS o
            INNER JOIN TENANT_CUSTOMERS tc ON tc.id = o.tenant_customer_id
                AND tc.tenant_id = o.tenant_id AND tc.status = 'A'
            INNER JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
                AND ci.user_id = :user_id AND ci.status = 'A'
            INNER JOIN TENANTS t ON t.id = o.tenant_id AND t.status = 'A'
            LEFT JOIN BUSINESS_PROFILES bp ON bp.tenant_id = o.tenant_id AND bp.status = 'A'
            WHERE o.status = 'A' " . $tenantFilter . "
            ORDER BY o.ordered_on DESC, o.id DESC LIMIT :limit OFFSET :offset",
            $params, 'getCustomerOrders');
    }

    public function countCustomerOrders(ConnectionInterface $db, int $userId, ?int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $tenantFilter = $tenantId === null ? '' : ' AND o.tenant_id = :tenant_id';
        $params = [':user_id' => $userId];
        if ($tenantId !== null) {
            $params[':tenant_id'] = $tenantId;
        }
        return $this->one($db, "SELECT COUNT(*) AS total
            FROM ORDERS o
            INNER JOIN TENANT_CUSTOMERS tc ON tc.id = o.tenant_customer_id
                AND tc.tenant_id = o.tenant_id AND tc.status = 'A'
            INNER JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
                AND ci.user_id = :user_id AND ci.status = 'A'
            WHERE o.status = 'A' " . $tenantFilter, $params, 'countCustomerOrders');
    }

    public function getCustomerOrder(ConnectionInterface $db, int $userId, int $orderId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT o.id, o.tenant_id, o.order_number, o.order_channel,
            o.order_status, o.payment_status, o.fulfilment_status, o.ordered_on,
            o.subtotal, o.discount_amount, o.tax_amount, o.delivery_fee, o.grand_total,
            o.amount_paid, o.notes, t.default_currency, bp.business_name
            FROM ORDERS o
            INNER JOIN TENANT_CUSTOMERS tc ON tc.id = o.tenant_customer_id
                AND tc.tenant_id = o.tenant_id AND tc.status = 'A'
            INNER JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
                AND ci.user_id = :user_id AND ci.status = 'A'
            INNER JOIN TENANTS t ON t.id = o.tenant_id AND t.status = 'A'
            LEFT JOIN BUSINESS_PROFILES bp ON bp.tenant_id = o.tenant_id AND bp.status = 'A'
            WHERE o.id = :order_id AND o.status = 'A' LIMIT 1",
            [':user_id' => $userId, ':order_id' => $orderId], 'getCustomerOrder');
    }

    public function getOrderItems(ConnectionInterface $db, int $tenantId, int $orderId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, product_id, variant_id, product_name_snapshot,
            product_code_snapshot, unit_id, quantity, unit_price, discount_amount,
            tax_rate, tax_amount, line_total
            FROM ORDER_ITEMS
            WHERE tenant_id = :tenant_id AND order_id = :order_id AND status = 'A'
            ORDER BY id ASC",
            [':tenant_id' => $tenantId, ':order_id' => $orderId], 'getOrderItems');
    }

    public function getOrderHistory(ConnectionInterface $db, int $tenantId, int $orderId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT old_status, new_status, change_note, changed_on
            FROM ORDER_STATUS_HISTORY
            WHERE tenant_id = :tenant_id AND order_id = :order_id AND status = 'A'
            ORDER BY changed_on ASC, id ASC",
            [':tenant_id' => $tenantId, ':order_id' => $orderId], 'getOrderHistory');
    }

    public function getOrderFulfilments(ConnectionInterface $db, int $tenantId, int $orderId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT fulfilment_type, fulfilment_status, delivery_partner,
            tracking_reference, dispatched_on, delivered_on, recipient_name, recipient_mobile,
            delivery_address_snapshot
            FROM ORDER_FULFILMENTS
            WHERE tenant_id = :tenant_id AND order_id = :order_id AND status = 'A'
            ORDER BY id ASC",
            [':tenant_id' => $tenantId, ':order_id' => $orderId], 'getOrderFulfilments');
    }

    public function hasTenantOrderManagementPermission(ConnectionInterface $db, int $userId, int $tenantId, string $permissionCode, bool $lock = false): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $sql = "SELECT 1 AS allowed
            FROM USERS u
            INNER JOIN TENANT_MEMBERSHIPS tm ON tm.user_id = u.id
                AND tm.status = 'A' AND tm.membership_status = 'ACTIVE'
            INNER JOIN TENANTS t ON t.id = tm.tenant_id
                AND t.status = 'A' AND t.tenant_status = 'ACTIVE'
            INNER JOIN USER_ROLE_ASSIGNMENTS ura ON ura.user_id = u.id
                AND ura.tenant_id = tm.tenant_id AND ura.status = 'A'
                AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
            INNER JOIN ROLES r ON r.id = ura.role_id AND r.scope_type = 'TENANT' AND r.status = 'A'
            INNER JOIN ROLE_PERMISSIONS rp ON rp.role_id = r.id AND rp.status = 'A'
            INNER JOIN PERMISSIONS p ON p.id = rp.permission_id
                AND p.permission_code = :permission_code AND p.module_code = 'ORDER' AND p.status = 'A'
            WHERE u.id = :user_id AND u.status = 'A' AND u.account_status = 'ACTIVE'
                AND tm.tenant_id = :tenant_id
            LIMIT 1";
        if ($lock) {
            $sql .= ' FOR UPDATE';
        }
        return $this->one($db, $sql, [':user_id' => $userId, ':tenant_id' => $tenantId, ':permission_code' => $permissionCode], 'hasTenantOrderManagementPermission');
    }

    public function getTenantOrders(ConnectionInterface $db, int $tenantId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT o.id, o.tenant_id, o.order_number, o.order_channel,
            o.order_status, o.payment_status, o.fulfilment_status, o.ordered_on,
            o.subtotal, o.tax_amount, o.grand_total, t.default_currency,
            tc.display_name AS customer_name, tc.mobile AS customer_mobile
            FROM ORDERS o
            INNER JOIN TENANTS t ON t.id = o.tenant_id AND t.status = 'A'
            LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = o.tenant_customer_id
                AND tc.tenant_id = o.tenant_id AND tc.status = 'A'
            WHERE o.tenant_id = :tenant_id AND o.status = 'A'
            ORDER BY o.ordered_on DESC, o.id DESC LIMIT :limit OFFSET :offset",
            [':tenant_id' => $tenantId, ':limit' => $limit, ':offset' => $offset], 'getTenantOrders');
    }

    public function countTenantOrders(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM ORDERS
            WHERE tenant_id = :tenant_id AND status = 'A'",
            [':tenant_id' => $tenantId], 'countTenantOrders');
    }

    public function getTenantOrder(ConnectionInterface $db, int $tenantId, int $orderId, bool $lock = false): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $sql = "SELECT o.id, o.tenant_id, o.order_number, o.order_channel,
            o.order_status, o.payment_status, o.fulfilment_status, o.ordered_on,
            o.subtotal, o.discount_amount, o.tax_amount, o.delivery_fee, o.grand_total,
            o.amount_paid, o.notes, t.default_currency,
            tc.display_name AS customer_name, tc.mobile AS customer_mobile, tc.email AS customer_email
            FROM ORDERS o
            INNER JOIN TENANTS t ON t.id = o.tenant_id AND t.status = 'A'
            LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = o.tenant_customer_id
                AND tc.tenant_id = o.tenant_id AND tc.status = 'A'
            WHERE o.id = :order_id AND o.tenant_id = :tenant_id AND o.status = 'A' LIMIT 1";
        if ($lock) {
            $sql .= ' FOR UPDATE';
        }
        return $this->one($db, $sql, [':tenant_id' => $tenantId, ':order_id' => $orderId], 'getTenantOrder');
    }

    public function updateTenantOrderStatus(ConnectionInterface $db, int $tenantId, int $orderId, int $userId, string $oldStatus, string $newStatus): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE ORDERS
                SET order_status = :new_status, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :order_id AND tenant_id = :tenant_id
                    AND order_status = :old_status AND status = 'A'",
                [':new_status' => $newStatus, ':user_id' => $userId, ':order_id' => $orderId,
                 ':tenant_id' => $tenantId, ':old_status' => $oldStatus])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Order status changed before this action could be completed.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $orderId];
        } catch (Throwable $exception) {
            return $this->error('updateTenantOrderStatus', $exception);
        }
        return $resArr;
    }

    public function createTenantOrderHistory(ConnectionInterface $db, int $tenantId, int $orderId, int $userId, string $oldStatus, string $newStatus, ?string $note): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO ORDER_STATUS_HISTORY
                (tenant_id, order_id, old_status, new_status, changed_by, change_note, changed_on,
                 status, created_by, updated_by)
                VALUES (:tenant_id, :order_id, :old_status, :new_status, :user_id, :note, CURRENT_TIMESTAMP,
                    'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':order_id' => $orderId, ':old_status' => $oldStatus,
                 ':new_status' => $newStatus, ':user_id' => $userId, ':note' => $note])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('createTenantOrderHistory', $exception);
        }
        return $resArr;
    }

    private function one(ConnectionInterface $db, string $sql, array $params, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $row = $db->createCommand($sql, $params)->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            return $this->error($operation, $exception);
        }
        return $resArr;
    }

    private function many(ConnectionInterface $db, string $sql, array $params, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $rows = $db->createCommand($sql, $params)->queryAll();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($rows) ? $rows : [];
        } catch (Throwable $exception) {
            return $this->error($operation, $exception);
        }
        return $resArr;
    }

    private function error(string $operation, Throwable $exception): array
    {
        $resArr = ['status' => 'EXCEPTION', 'msgArr' => [], 'data' => []];
        $this->logger->error('OrderDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Order data operation failed.';
        return $resArr;
    }
}
