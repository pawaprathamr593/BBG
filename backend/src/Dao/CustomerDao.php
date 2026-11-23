<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class CustomerDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getEligibleTenant(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT t.id, t.default_currency
            FROM TENANTS t
            INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = t.id
                AND bp.approval_status = 'APPROVED' AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
            INNER JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = t.id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
            WHERE t.id = :tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
            LIMIT 1", [':tenant_id' => $tenantId], 'getEligibleTenant');
    }

    public function getCustomerIdentity(ConnectionInterface $db, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, user_id, full_name, email, mobile
            FROM CUSTOMER_IDENTITIES
            WHERE user_id = :user_id AND identity_status = 'ACTIVE' AND status = 'A'
            ORDER BY id DESC LIMIT 1", [':user_id' => $userId], 'getCustomerIdentity');
    }

    public function insertCustomerIdentity(ConnectionInterface $db, int $userId, string $fullName, ?string $email, ?string $mobile): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CUSTOMER_IDENTITIES
                (user_id, full_name, email, mobile, identity_status, status, created_by, updated_by)
                VALUES (:user_id, :full_name, :email, :mobile, 'ACTIVE', 'A', :user_id, :user_id)",
                [':user_id' => $userId, ':full_name' => $fullName, ':email' => $email, ':mobile' => $mobile])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertCustomerIdentity', $exception);
        }
        return $resArr;
    }

    public function getTenantCustomer(ConnectionInterface $db, int $tenantId, int $identityId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id, customer_code, display_name, mobile, email
            FROM TENANT_CUSTOMERS
            WHERE tenant_id = :tenant_id AND customer_identity_id = :identity_id
                AND customer_status = 'ACTIVE' AND status = 'A'
            LIMIT 1", [':tenant_id' => $tenantId, ':identity_id' => $identityId], 'getTenantCustomer');
    }

    public function getTenantCustomers(ConnectionInterface $db, int $tenantId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, customer_code, display_name, mobile, email, customer_type,
            credit_limit, opening_balance, customer_notes, customer_status, created_on
            FROM TENANT_CUSTOMERS
            WHERE tenant_id = :tenant_id AND customer_status <> 'DELETED' AND status = 'A'
            ORDER BY created_on DESC, id DESC LIMIT :limit OFFSET :offset",
            [':tenant_id' => $tenantId, ':limit' => $limit, ':offset' => $offset], 'getTenantCustomers');
    }

    public function countTenantCustomers(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM TENANT_CUSTOMERS
            WHERE tenant_id = :tenant_id AND customer_status <> 'DELETED' AND status = 'A'",
            [':tenant_id' => $tenantId], 'countTenantCustomers');
    }

    public function insertTenantCustomer(ConnectionInterface $db, int $tenantId, int $identityId, int $userId, string $fullName, ?string $email, ?string $mobile): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO TENANT_CUSTOMERS
                (tenant_id, customer_identity_id, customer_code, display_name, mobile, email,
                 customer_type, credit_limit, opening_balance, customer_status, status, created_by, updated_by)
                VALUES (:tenant_id, :identity_id, :customer_code, :full_name, :mobile, :email,
                 'INDIVIDUAL', 0, 0, 'ACTIVE', 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':identity_id' => $identityId,
                 ':customer_code' => 'WEB-' . $userId, ':full_name' => $fullName,
                 ':mobile' => $mobile, ':email' => $email, ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertTenantCustomer', $exception);
        }
        return $resArr;
    }

    public function getActiveTenant(ConnectionInterface $db, int $tenantId): array
    {
        return $this->one($db, "SELECT id, tenant_code, tenant_name
            FROM TENANTS
            WHERE id = :tenant_id AND tenant_status = 'ACTIVE' AND status = 'A'
            LIMIT 1", [':tenant_id' => $tenantId], 'getActiveTenant');
    }

    public function findTenantForCustomer(ConnectionInterface $db, int $userId, int $identityId): array
    {
        // 1. Existing customer association in an active tenant
        $row = $this->one($db, "SELECT tc.tenant_id, tc.id AS tenant_customer_id
            FROM TENANT_CUSTOMERS tc
            INNER JOIN TENANTS t ON t.id = tc.tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
            WHERE tc.customer_identity_id = :identity_id AND tc.customer_status = 'ACTIVE' AND tc.status = 'A'
            ORDER BY tc.id ASC LIMIT 1", [':identity_id' => $identityId], 'findTenantForCustomer');
        if ($row['status'] === 'SUCCESS' && !empty($row['data']['tenant_id'])) {
            return $row;
        }

        // 2. Tenant where user is an active member
        $row = $this->one($db, "SELECT tm.tenant_id
            FROM TENANT_MEMBERSHIPS tm
            INNER JOIN TENANTS t ON t.id = tm.tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
            WHERE tm.user_id = :user_id AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
            ORDER BY tm.id ASC LIMIT 1", [':user_id' => $userId], 'findTenantForCustomer');
        if ($row['status'] === 'SUCCESS' && !empty($row['data']['tenant_id'])) {
            return $row;
        }

        // 3. Any active tenant in the platform
        return $this->one($db, "SELECT t.id AS tenant_id
            FROM TENANTS t
            WHERE t.tenant_status = 'ACTIVE' AND t.status = 'A'
            ORDER BY t.id ASC LIMIT 1", [], 'findTenantForCustomer');
    }

    /** Global personal address book: every row is owned by the authenticated USERS.id or associated customer identity. */
    public function getAddresses(ConnectionInterface $db, int $userId): array
    {
        return $this->many($db, "SELECT ca.id, ca.tenant_id, ca.tenant_customer_id, ca.address_label, ca.recipient_name, ca.mobile,
            ca.address_line_1, ca.address_line_2, ca.city, ca.state, ca.postal_code, ca.country_code, ca.is_default
            FROM CUSTOMER_ADDRESSES ca
            LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = ca.tenant_customer_id
            LEFT JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
            WHERE (ca.created_by = :user_id OR ci.user_id = :user_id) AND ca.status = 'A'
            ORDER BY ca.is_default DESC, ca.id DESC",
            [':user_id' => $userId], 'getAddresses');
    }

    public function insertAddress(ConnectionInterface $db, int $tenantId, int $tenantCustomerId, int $userId, string $label, string $recipient, string $mobile, string $line1, string $line2, string $city, string $state, string $postal, string $country, int $isDefault): array
    {
        try {
            $db->createCommand("INSERT INTO CUSTOMER_ADDRESSES
                (tenant_id, tenant_customer_id, address_label, recipient_name, mobile,
                 address_line_1, address_line_2, city, state, postal_code, country_code,
                 is_default, status, created_by, updated_by)
                VALUES (:tenant_id, :tenant_customer_id, :label, :recipient, :mobile,
                 :line1, :line2, :city, :state, :postal, :country,
                 :is_default, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':tenant_customer_id' => $tenantCustomerId,
                 ':label' => $label, ':recipient' => $recipient, ':mobile' => $mobile,
                 ':line1' => $line1, ':line2' => $line2, ':city' => $city, ':state' => $state,
                 ':postal' => $postal, ':country' => $country, ':is_default' => $isDefault,
                 ':user_id' => $userId])->execute();
            return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => ['id' => (int) $db->getLastInsertId()]];
        } catch (Throwable $exception) {
            return $this->error('insertAddress', $exception);
        }
    }

    public function getAddress(ConnectionInterface $db, int $userId, int $addressId): array
    {
        return $this->one($db, "SELECT ca.id, ca.tenant_id, ca.tenant_customer_id
            FROM CUSTOMER_ADDRESSES ca
            LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = ca.tenant_customer_id
            LEFT JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
            WHERE ca.id = :id AND (ca.created_by = :user_id OR ci.user_id = :user_id) AND ca.status = 'A' LIMIT 1",
            [':id' => $addressId, ':user_id' => $userId], 'getAddress');
    }

    public function updateAddress(ConnectionInterface $db, int $userId, int $addressId, int $actorId, string $label, string $recipient, string $mobile, string $line1, string $line2, string $city, string $state, string $postal, string $country, int $isDefault): array
    {
        try {
            $affected = $db->createCommand("UPDATE CUSTOMER_ADDRESSES ca
                LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = ca.tenant_customer_id
                LEFT JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
                SET ca.address_label = :label, ca.recipient_name = :recipient, ca.mobile = :mobile,
                    ca.address_line_1 = :line1, ca.address_line_2 = :line2, ca.city = :city,
                    ca.state = :state, ca.postal_code = :postal, ca.country_code = :country,
                    ca.is_default = :is_default, ca.updated_by = :actor_id, ca.updated_on = CURRENT_TIMESTAMP
                WHERE ca.id = :id AND (ca.created_by = :user_id OR ci.user_id = :user_id) AND ca.status = 'A'",
                [':label' => $label, ':recipient' => $recipient, ':mobile' => $mobile, ':line1' => $line1,
                 ':line2' => $line2, ':city' => $city, ':state' => $state, ':postal' => $postal,
                 ':country' => $country, ':is_default' => $isDefault, ':actor_id' => $actorId,
                 ':id' => $addressId, ':user_id' => $userId])->execute();
            if ($affected < 0) return ['status' => 'FAILED', 'msgArr' => ['Customer address was not found.'], 'data' => []];
            return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => ['id' => $addressId]];
        } catch (Throwable $exception) { return $this->error('updateAddress', $exception); }
    }

    public function clearDefaultAddresses(ConnectionInterface $db, int $userId, int $actorId): array
    {
        try {
            $db->createCommand("UPDATE CUSTOMER_ADDRESSES ca
                LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = ca.tenant_customer_id
                LEFT JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
                SET ca.is_default = 0, ca.updated_by = :actor_id, ca.updated_on = CURRENT_TIMESTAMP
                WHERE (ca.created_by = :user_id OR ci.user_id = :user_id) AND ca.status = 'A'",
                [':actor_id' => $actorId, ':user_id' => $userId])->execute();
            return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => []];
        } catch (Throwable $exception) { return $this->error('clearDefaultAddresses', $exception); }
    }

    public function setDefaultAddress(ConnectionInterface $db, int $userId, int $addressId, int $actorId): array
    {
        try {
            $affected = $db->createCommand("UPDATE CUSTOMER_ADDRESSES ca
                LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = ca.tenant_customer_id
                LEFT JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
                SET ca.is_default = 1, ca.updated_by = :actor_id, ca.updated_on = CURRENT_TIMESTAMP
                WHERE ca.id = :id AND (ca.created_by = :user_id OR ci.user_id = :user_id) AND ca.status = 'A'",
                [':actor_id' => $actorId, ':id' => $addressId, ':user_id' => $userId])->execute();
            if ($affected < 0) return ['status' => 'FAILED', 'msgArr' => ['Customer address was not found.'], 'data' => []];
            return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => ['id' => $addressId]];
        } catch (Throwable $exception) { return $this->error('setDefaultAddress', $exception); }
    }

    public function softDeleteAddress(ConnectionInterface $db, int $userId, int $addressId, int $actorId): array
    {
        try {
            $affected = $db->createCommand("UPDATE CUSTOMER_ADDRESSES ca
                LEFT JOIN TENANT_CUSTOMERS tc ON tc.id = ca.tenant_customer_id
                LEFT JOIN CUSTOMER_IDENTITIES ci ON ci.id = tc.customer_identity_id
                SET ca.status = 'Z', ca.is_default = 0, ca.updated_by = :actor_id, ca.updated_on = CURRENT_TIMESTAMP
                WHERE ca.id = :id AND (ca.created_by = :user_id OR ci.user_id = :user_id) AND ca.status = 'A'",
                [':actor_id' => $actorId, ':id' => $addressId, ':user_id' => $userId])->execute();
            if ($affected < 1) return ['status' => 'FAILED', 'msgArr' => ['Customer address was not found.'], 'data' => []];
            return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => ['id' => $addressId]];
        } catch (Throwable $exception) { return $this->error('softDeleteAddress', $exception); }
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
        $this->logger->error('CustomerDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Customer data operation failed.';
        return $resArr;
    }
}
