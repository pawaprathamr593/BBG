<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class PaymentDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getCustomerIdentity(ConnectionInterface $db, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM CUSTOMER_IDENTITIES
            WHERE user_id = :user_id AND identity_status = 'ACTIVE' AND status = 'A'
            ORDER BY id DESC LIMIT 1", [':user_id' => $userId], 'getCustomerIdentity');
    }

    public function getMyPayments(ConnectionInterface $db, int $identityId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT p.id, p.tenant_id, p.order_id, p.payment_number,
            p.payment_method, p.payment_status, p.amount, p.currency, p.paid_on,
            p.reference_number, p.notes, o.order_number, bp.business_name
            FROM PAYMENTS p
            LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = p.tenant_customer_id
                AND tc.customer_identity_id = :identity_id AND tc.status = 'A'
            LEFT JOIN ORDERS o ON o.id = p.order_id AND o.tenant_id = p.tenant_id AND o.status = 'A'
            LEFT JOIN BUSINESS_PROFILES bp ON bp.tenant_id = p.tenant_id AND bp.status = 'A'
            WHERE p.tenant_customer_id = tc.id AND p.status = 'A'
            ORDER BY p.created_on DESC, p.id DESC LIMIT :limit OFFSET :offset",
            [':identity_id' => $identityId, ':limit' => $limit, ':offset' => $offset], 'getMyPayments');
    }

    public function countMyPayments(ConnectionInterface $db, int $identityId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total
            FROM PAYMENTS p
            INNER JOIN TENANT_CUSTOMERS tc ON tc.id = p.tenant_customer_id
                AND tc.customer_identity_id = :identity_id AND tc.status = 'A'
            WHERE p.status = 'A'", [':identity_id' => $identityId], 'countMyPayments');
    }

    public function getMyPayment(ConnectionInterface $db, int $identityId, int $paymentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT p.id, p.tenant_id, p.order_id, p.tenant_customer_id,
            p.payment_number, p.payment_method, p.payment_status, p.amount, p.currency,
            p.paid_on, p.reference_number, p.notes, o.order_number, bp.business_name
            FROM PAYMENTS p
            INNER JOIN TENANT_CUSTOMERS tc ON tc.id = p.tenant_customer_id
                AND tc.customer_identity_id = :identity_id AND tc.status = 'A'
            LEFT JOIN ORDERS o ON o.id = p.order_id AND o.tenant_id = p.tenant_id AND o.status = 'A'
            LEFT JOIN BUSINESS_PROFILES bp ON bp.tenant_id = p.tenant_id AND bp.status = 'A'
            WHERE p.id = :payment_id AND p.status = 'A' LIMIT 1",
            [':identity_id' => $identityId, ':payment_id' => $paymentId], 'getMyPayment');
    }

    public function getTenantPayments(ConnectionInterface $db, int $tenantId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT p.id, p.order_id, p.tenant_customer_id, p.payment_number,
            p.payment_method, p.payment_status, p.amount, p.currency, p.paid_on,
            p.reference_number, p.notes, o.order_number, tc.display_name AS customer_name
            FROM PAYMENTS p
            LEFT JOIN ORDERS o ON o.id = p.order_id AND o.tenant_id = p.tenant_id AND o.status = 'A'
            LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = p.tenant_customer_id
                AND tc.tenant_id = p.tenant_id AND tc.status = 'A'
            WHERE p.tenant_id = :tenant_id AND p.status = 'A'
            ORDER BY p.created_on DESC, p.id DESC LIMIT :limit OFFSET :offset",
            [':tenant_id' => $tenantId, ':limit' => $limit, ':offset' => $offset], 'getTenantPayments');
    }

    public function countTenantPayments(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM PAYMENTS
            WHERE tenant_id = :tenant_id AND status = 'A'", [':tenant_id' => $tenantId], 'countTenantPayments');
    }

    public function getTenantPayment(ConnectionInterface $db, int $tenantId, int $paymentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT p.id, p.tenant_id, p.order_id, p.tenant_customer_id,
            p.payment_number, p.payment_method, p.payment_status, p.amount, p.currency,
            p.paid_on, p.reference_number, p.received_by, p.notes,
            o.order_number, tc.display_name AS customer_name
            FROM PAYMENTS p
            LEFT JOIN ORDERS o ON o.id = p.order_id AND o.tenant_id = p.tenant_id AND o.status = 'A'
            LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = p.tenant_customer_id
                AND tc.tenant_id = p.tenant_id AND tc.status = 'A'
            WHERE p.id = :payment_id AND p.tenant_id = :tenant_id AND p.status = 'A' LIMIT 1",
            [':payment_id' => $paymentId, ':tenant_id' => $tenantId], 'getTenantPayment');
    }

    public function getPaymentTransactions(ConnectionInterface $db, int $tenantId, int $paymentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, provider_code, provider_transaction_id, provider_order_id,
            transaction_status, request_reference, response_reference, amount, processed_on
            FROM PAYMENT_TRANSACTIONS
            WHERE tenant_id = :tenant_id AND payment_id = :payment_id AND status = 'A'
            ORDER BY created_on DESC, id DESC",
            [':tenant_id' => $tenantId, ':payment_id' => $paymentId], 'getPaymentTransactions');
    }

    public function getPaymentRefunds(ConnectionInterface $db, int $tenantId, int $paymentId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, refund_number, refund_amount, refund_reason,
            refund_status, refunded_on, provider_refund_reference
            FROM REFUNDS
            WHERE tenant_id = :tenant_id AND payment_id = :payment_id AND status = 'A'
            ORDER BY created_on DESC, id DESC",
            [':tenant_id' => $tenantId, ':payment_id' => $paymentId], 'getPaymentRefunds');
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
        $this->logger->error('PaymentDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Payment data operation failed.';
        return $resArr;
    }
}
