<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class SubscriptionDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getActivePlans(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT p.id, p.plan_code, p.plan_name, p.description,
            p.billing_cycle, p.price, p.currency,
            GROUP_CONCAT(CONCAT(pe.entitlement_code, '=', pe.entitlement_value) ORDER BY pe.entitlement_code SEPARATOR ';') AS entitlements
            FROM PLANS p
            LEFT JOIN PLAN_ENTITLEMENTS pe ON pe.plan_id = p.id AND pe.status = 'A'
            WHERE p.plan_status = 'ACTIVE' AND p.status = 'A'
            GROUP BY p.id, p.plan_code, p.plan_name, p.description, p.billing_cycle, p.price, p.currency
            ORDER BY p.price ASC, p.id ASC", [], 'getActivePlans');
    }

    public function getPlan(ConnectionInterface $db, int $planId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, plan_code, plan_name, description, billing_cycle, price, currency
            FROM PLANS WHERE id = :id AND plan_status = 'ACTIVE' AND status = 'A' LIMIT 1",
            [':id' => $planId], 'getPlan');
    }

    public function hasActiveSubscription(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM TENANT_SUBSCRIPTIONS
            WHERE tenant_id = :tenant_id AND subscription_status = 'ACTIVE' AND status = 'A'
                AND (starts_on IS NULL OR starts_on <= CURRENT_TIMESTAMP)
                AND (ends_on IS NULL OR ends_on >= CURRENT_TIMESTAMP)
            LIMIT 1", [':tenant_id' => $tenantId], 'hasActiveSubscription');
    }

    public function hasPendingSubscription(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM TENANT_SUBSCRIPTIONS
            WHERE tenant_id = :tenant_id AND subscription_status = 'PENDING' AND status = 'A'
            LIMIT 1", [':tenant_id' => $tenantId], 'hasPendingSubscription');
    }

    public function insertSubscription(ConnectionInterface $db, int $tenantId, int $planId, int $userId, string $amount, string $currency, ?int $upgradeFromSubscriptionId = null): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO TENANT_SUBSCRIPTIONS
                (tenant_id, upgrade_from_subscription_id, plan_id, subscription_status, amount, currency, status, created_by, updated_by)
                VALUES (:tenant_id, :upgrade_from_subscription_id, :plan_id, 'PENDING', :amount, :currency, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':upgrade_from_subscription_id' => $upgradeFromSubscriptionId,
                 ':plan_id' => $planId, ':amount' => $amount, ':currency' => $currency,
                 ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertSubscription', $exception);
        }
        return $resArr;
    }

    public function getActivePaymentQrConfig(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, config_version, payee_name, upi_id, qr_file_path, payment_instructions
            FROM PLATFORM_PAYMENT_QR_CONFIG
            WHERE config_status = 'ACTIVE' AND status = 'A'
                AND effective_from <= CURRENT_TIMESTAMP
                AND (effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP)
            ORDER BY config_version DESC LIMIT 1", [], 'getActivePaymentQrConfig');
    }

    public function insertSubscriptionPaymentInstructions(
        ConnectionInterface $db,
        int $tenantId,
        int $subscriptionId,
        int $userId,
        array $config,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO TENANT_SUBSCRIPTION_PAYMENT_INSTRUCTIONS
                (tenant_id, subscription_id, qr_config_id, config_version, payee_name, upi_id,
                 qr_file_path, payment_instructions, captured_on, status, created_by, updated_by)
                VALUES (:tenant_id, :subscription_id, :config_id, :version, :payee, :upi,
                 :qr_path, :instructions, CURRENT_TIMESTAMP, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':subscription_id' => $subscriptionId,
                 ':config_id' => (int) $config['id'], ':version' => (int) $config['config_version'],
                 ':payee' => (string) $config['payee_name'], ':upi' => (string) $config['upi_id'],
                 ':qr_path' => (string) $config['qr_file_path'],
                 ':instructions' => $config['payment_instructions'] ?? null,
                 ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['subscription_id' => $subscriptionId, 'config_version' => (int) $config['config_version']];
        } catch (Throwable $exception) {
            return $this->error('insertSubscriptionPaymentInstructions', $exception);
        }
        return $resArr;
    }

    public function setRejectedSubscriptionPending(ConnectionInterface $db, int $tenantId, int $subscriptionId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE TENANT_SUBSCRIPTIONS
                SET subscription_status = 'PENDING', updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :subscription_id AND tenant_id = :tenant_id
                    AND subscription_status = 'REJECTED' AND status = 'A'",
                [':user_id' => $userId, ':subscription_id' => $subscriptionId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Rejected subscription could not be reopened for review.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['subscription_id' => $subscriptionId, 'subscription_status' => 'PENDING'];
        } catch (Throwable $exception) {
            return $this->error('setRejectedSubscriptionPending', $exception);
        }
        return $resArr;
    }

    public function getTenantSubscriptions(ConnectionInterface $db, int $tenantId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT ts.id, ts.upgrade_from_subscription_id, ts.plan_id, p.plan_code, p.plan_name, p.billing_cycle,
            CASE WHEN ts.subscription_status = 'ACTIVE' AND ts.ends_on < CURRENT_TIMESTAMP THEN 'EXPIRED' ELSE ts.subscription_status END AS subscription_status,
            ts.starts_on, ts.ends_on, ts.renewal_due_on,
            ts.amount, ts.currency, ts.approved_on, ts.rejection_reason, ts.created_on, ts.bcn,
            instructions.config_version AS payment_qr_version, instructions.payee_name AS payment_payee_name,
            instructions.upi_id AS payment_upi_id, instructions.qr_file_path AS payment_qr_file_path,
            instructions.payment_instructions,
            (SELECT proof.review_status FROM SUBSCRIPTION_PAYMENT_PROOFS proof
                WHERE proof.tenant_id = ts.tenant_id AND proof.subscription_id = ts.id AND proof.status = 'A'
                ORDER BY proof.id DESC LIMIT 1) AS latest_proof_review_status,
            (SELECT proof.submitted_on FROM SUBSCRIPTION_PAYMENT_PROOFS proof
                WHERE proof.tenant_id = ts.tenant_id AND proof.subscription_id = ts.id AND proof.status = 'A'
                ORDER BY proof.id DESC LIMIT 1) AS latest_proof_submitted_on
            FROM TENANT_SUBSCRIPTIONS ts
            INNER JOIN PLANS p ON p.id = ts.plan_id AND p.status = 'A'
            LEFT JOIN TENANT_SUBSCRIPTION_PAYMENT_INSTRUCTIONS instructions
                ON instructions.tenant_id = ts.tenant_id AND instructions.subscription_id = ts.id
                AND instructions.status = 'A'
            WHERE ts.tenant_id = :tenant_id AND ts.status = 'A'
            ORDER BY ts.created_on DESC, ts.id DESC LIMIT :limit OFFSET :offset",
            [':tenant_id' => $tenantId, ':limit' => $limit, ':offset' => $offset], 'getTenantSubscriptions');
    }

    public function countTenantSubscriptions(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM TENANT_SUBSCRIPTIONS
            WHERE tenant_id = :tenant_id AND status = 'A'", [':tenant_id' => $tenantId], 'countTenantSubscriptions');
    }

    public function getTenantSubscription(ConnectionInterface $db, int $tenantId, int $subscriptionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT ts.id, ts.tenant_id, ts.upgrade_from_subscription_id, ts.plan_id, p.plan_code, p.plan_name,
            p.billing_cycle, ts.subscription_status, ts.starts_on, ts.ends_on, ts.renewal_due_on,
            ts.amount, ts.currency, ts.approved_by, ts.approved_on, ts.rejection_reason, ts.created_on, ts.bcn,
            instructions.config_version AS payment_qr_version, instructions.payee_name AS payment_payee_name,
            instructions.upi_id AS payment_upi_id, instructions.qr_file_path AS payment_qr_file_path,
            instructions.payment_instructions
            FROM TENANT_SUBSCRIPTIONS ts
            INNER JOIN PLANS p ON p.id = ts.plan_id AND p.status = 'A'
            LEFT JOIN TENANT_SUBSCRIPTION_PAYMENT_INSTRUCTIONS instructions
                ON instructions.tenant_id = ts.tenant_id AND instructions.subscription_id = ts.id
                AND instructions.status = 'A'
            WHERE ts.id = :id AND ts.tenant_id = :tenant_id AND ts.status = 'A' LIMIT 1",
            [':id' => $subscriptionId, ':tenant_id' => $tenantId], 'getTenantSubscription');
    }

    public function hasPendingProof(ConnectionInterface $db, int $tenantId, int $subscriptionId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM SUBSCRIPTION_PAYMENT_PROOFS
            WHERE tenant_id = :tenant_id AND subscription_id = :subscription_id
                AND review_status = 'PENDING' AND status = 'A'
            LIMIT 1", [':tenant_id' => $tenantId, ':subscription_id' => $subscriptionId], 'hasPendingProof');
    }

    public function insertSubscriptionProof(ConnectionInterface $db, int $tenantId, int $subscriptionId, int $userId, ?string $paymentReference, string $proofFilePath): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO SUBSCRIPTION_PAYMENT_PROOFS
                (tenant_id, subscription_id, payment_reference, proof_file_path, submitted_on,
                 review_status, status, created_by, updated_by)
                VALUES (:tenant_id, :subscription_id, :payment_reference, :proof_path, CURRENT_TIMESTAMP,
                 'PENDING', 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':subscription_id' => $subscriptionId,
                 ':payment_reference' => $paymentReference, ':proof_path' => $proofFilePath,
                 ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertSubscriptionProof', $exception);
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
        $this->logger->error('SubscriptionDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Subscription data operation failed.';
        return $resArr;
    }
}
