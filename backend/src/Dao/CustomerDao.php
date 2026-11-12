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

    public function getAddresses(ConnectionInterface $db, int $tenantId, int $tenantCustomerId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, address_label, recipient_name, mobile, address_line_1,
            address_line_2, city, state, postal_code, country_code, is_default
            FROM CUSTOMER_ADDRESSES
            WHERE tenant_id = :tenant_id AND tenant_customer_id = :customer_id AND status = 'A'
            ORDER BY is_default DESC, id DESC",
            [':tenant_id' => $tenantId, ':customer_id' => $tenantCustomerId], 'getAddresses');
    }

    public function insertAddress(ConnectionInterface $db, int $tenantId, int $tenantCustomerId, int $userId, string $label, string $recipient, string $mobile, string $line1, string $line2, string $city, string $state, string $postal, string $country, int $isDefault): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CUSTOMER_ADDRESSES
                (tenant_id, tenant_customer_id, address_label, recipient_name, mobile,
                 address_line_1, address_line_2, city, state, postal_code, country_code,
                 is_default, status, created_by, updated_by)
                VALUES (:tenant_id, :customer_id, :label, :recipient, :mobile,
                 :line1, :line2, :city, :state, :postal, :country,
                 :is_default, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':customer_id' => $tenantCustomerId, ':label' => $label,
                 ':recipient' => $recipient, ':mobile' => $mobile, ':line1' => $line1, ':line2' => $line2,
                 ':city' => $city, ':state' => $state, ':postal' => $postal, ':country' => $country,
                 ':is_default' => $isDefault, ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertAddress', $exception);
        }
        return $resArr;
    }

    public function getAddress(ConnectionInterface $db, int $tenantId, int $tenantCustomerId, int $addressId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM CUSTOMER_ADDRESSES
            WHERE id = :id AND tenant_id = :tenant_id AND tenant_customer_id = :customer_id AND status = 'A'
            LIMIT 1", [':id' => $addressId, ':tenant_id' => $tenantId, ':customer_id' => $tenantCustomerId], 'getAddress');
    }

    public function updateAddress(ConnectionInterface $db, int $tenantId, int $tenantCustomerId, int $addressId, int $userId, string $label, string $recipient, string $mobile, string $line1, string $line2, string $city, string $state, string $postal, string $country, int $isDefault): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE CUSTOMER_ADDRESSES
                SET address_label = :label, recipient_name = :recipient, mobile = :mobile,
                    address_line_1 = :line1, address_line_2 = :line2, city = :city,
                    state = :state, postal_code = :postal, country_code = :country,
                    is_default = :is_default, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND tenant_customer_id = :customer_id AND status = 'A'",
                [':label' => $label, ':recipient' => $recipient, ':mobile' => $mobile, ':line1' => $line1,
                 ':line2' => $line2, ':city' => $city, ':state' => $state, ':postal' => $postal,
                 ':country' => $country, ':is_default' => $isDefault, ':user_id' => $userId,
                 ':id' => $addressId, ':tenant_id' => $tenantId, ':customer_id' => $tenantCustomerId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Customer address was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $addressId];
        } catch (Throwable $exception) {
            return $this->error('updateAddress', $exception);
        }
        return $resArr;
    }

    public function clearDefaultAddresses(ConnectionInterface $db, int $tenantId, int $tenantCustomerId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("UPDATE CUSTOMER_ADDRESSES SET is_default = 0, updated_by = :user_id
                WHERE tenant_id = :tenant_id AND tenant_customer_id = :customer_id AND status = 'A'",
                [':user_id' => $userId, ':tenant_id' => $tenantId, ':customer_id' => $tenantCustomerId])->execute();
            $resArr['status'] = 'SUCCESS';
            return $resArr;
        } catch (Throwable $exception) {
            return $this->error('clearDefaultAddresses', $exception);
        }
    }

    public function setDefaultAddress(ConnectionInterface $db, int $tenantId, int $tenantCustomerId, int $addressId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE CUSTOMER_ADDRESSES SET is_default = 1, updated_by = :user_id
                WHERE id = :id AND tenant_id = :tenant_id AND tenant_customer_id = :customer_id AND status = 'A'",
                [':user_id' => $userId, ':id' => $addressId, ':tenant_id' => $tenantId, ':customer_id' => $tenantCustomerId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Customer address was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $addressId];
        } catch (Throwable $exception) {
            return $this->error('setDefaultAddress', $exception);
        }
        return $resArr;
    }

    public function softDeleteAddress(ConnectionInterface $db, int $tenantId, int $tenantCustomerId, int $addressId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE CUSTOMER_ADDRESSES SET status = 'Z', is_default = 0,
                updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE id = :id AND tenant_id = :tenant_id AND tenant_customer_id = :customer_id AND status = 'A'",
                [':user_id' => $userId, ':id' => $addressId, ':tenant_id' => $tenantId, ':customer_id' => $tenantCustomerId])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Customer address was not found.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $addressId];
        } catch (Throwable $exception) {
            return $this->error('softDeleteAddress', $exception);
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
        $this->logger->error('CustomerDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Customer data operation failed.';
        return $resArr;
    }
}
