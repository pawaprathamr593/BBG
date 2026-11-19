<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class BusinessDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function isBusinessSlugAvailable(ConnectionInterface $db, string $slug, int $excludeBusinessId = 0): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT id FROM BUSINESS_PROFILES
             WHERE business_slug = :slug AND id <> :exclude_id AND status = 'A' LIMIT 1",
            [':slug' => $slug, ':exclude_id' => $excludeBusinessId],
            'isBusinessSlugAvailable',
        );
    }

    public function insertTenant(ConnectionInterface $db, string $tenantCode, string $tenantName, string $tenantType, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand(
                "INSERT INTO TENANTS
                    (tenant_code, tenant_name, tenant_type, default_currency, timezone,
                     tenant_status, status, created_by, updated_by)
                 VALUES (:code, :name, :type, 'INR', 'Asia/Kolkata',
                    'PENDING', 'A', :user_id, :user_id)",
                [':code' => $tenantCode, ':name' => $tenantName, ':type' => $tenantType, ':user_id' => $userId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertTenant', $exception);
        }
        return $resArr;
    }

    public function insertMembership(ConnectionInterface $db, int $tenantId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand(
                "INSERT INTO TENANT_MEMBERSHIPS
                    (tenant_id, user_id, membership_status, joined_on, status, created_by, updated_by)
                 VALUES (:tenant_id, :user_id, 'ACTIVE', CURRENT_TIMESTAMP, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':user_id' => $userId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertMembership', $exception);
        }
        return $resArr;
    }

    public function ensureTenantOwnerRole(ConnectionInterface $db): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $existing = $db->createCommand(
                "SELECT id FROM ROLES WHERE role_code = 'TENANT_OWNER' AND scope_type = 'TENANT' AND status = 'A' LIMIT 1",
            )->queryOne();

            if (is_array($existing) && isset($existing['id'])) {
                $roleId = (int) $existing['id'];
            } else {
                $db->createCommand(
                    "INSERT INTO ROLES (role_code, role_name, scope_type, description, status)
                     VALUES ('TENANT_OWNER', 'Tenant Owner', 'TENANT',
                        'Owner of an approved BBG tenant workspace.', 'A')",
                )->execute();
                $roleId = (int) $db->getLastInsertId();
            }

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $roleId];
        } catch (Throwable $exception) {
            return $this->error('ensureTenantOwnerRole', $exception);
        }
        return $resArr;
    }

    public function insertOwnerAssignment(ConnectionInterface $db, int $tenantId, int $userId, int $roleId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand(
                "INSERT INTO USER_ROLE_ASSIGNMENTS
                    (user_id, role_id, tenant_id, assigned_by, assigned_on, status, created_by, updated_by)
                 VALUES (:user_id, :role_id, :tenant_id, :user_id, CURRENT_TIMESTAMP, 'A', :user_id, :user_id)",
                [':user_id' => $userId, ':role_id' => $roleId, ':tenant_id' => $tenantId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertOwnerAssignment', $exception);
        }
        return $resArr;
    }

    public function insertBusinessProfile(
        ConnectionInterface $db,
        int $tenantId,
        string $businessName,
        string $businessSlug,
        string $businessDescription,
        ?int $categoryId,
        string $businessPhone,
        string $whatsappNumber,
        string $businessEmail,
        string $addressLine1,
        string $addressLine2,
        string $city,
        string $state,
        string $postalCode,
        string $countryCode,
        ?float $latitude,
        ?float $longitude,
        ?float $locationAccuracyM,
        int $userId,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand(
                "INSERT INTO BUSINESS_PROFILES
                    (tenant_id, business_name, business_slug, business_description, primary_category_id,
                     business_phone, whatsapp_number, business_email, address_line_1, address_line_2,
                     city, state, postal_code, country_code, latitude, longitude, location_accuracy_m,
                     approval_status, publication_status, status, created_by, updated_by)
                 VALUES
                    (:tenant_id, :business_name, :business_slug, :description, :category_id,
                     :phone, :whatsapp, :email, :address1, :address2,
                     :city, :state, :postal, :country, :latitude, :longitude, :location_accuracy_m,
                     'PENDING', 'DRAFT', 'A', :user_id, :user_id)",
                [
                    ':tenant_id' => $tenantId, ':business_name' => $businessName, ':business_slug' => $businessSlug,
                    ':description' => $businessDescription, ':category_id' => $categoryId,
                    ':phone' => $businessPhone, ':whatsapp' => $whatsappNumber, ':email' => $businessEmail,
                    ':address1' => $addressLine1, ':address2' => $addressLine2, ':city' => $city,
                    ':state' => $state, ':postal' => $postalCode, ':country' => $countryCode,
                    ':latitude' => $latitude, ':longitude' => $longitude,
                    ':location_accuracy_m' => $locationAccuracyM, ':user_id' => $userId,
                ],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertBusinessProfile', $exception);
        }
        return $resArr;
    }

    public function insertStorefrontSettings(ConnectionInterface $db, int $tenantId, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand(
                "INSERT INTO STOREFRONT_SETTINGS
                    (tenant_id, show_prices, accept_online_orders, whatsapp_enabled,
                     storefront_status, status, created_by, updated_by)
                 VALUES (:tenant_id, 1, 0, 0, 'INACTIVE', 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':user_id' => $userId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertStorefrontSettings', $exception);
        }
        return $resArr;
    }

    public function getMyBusinessApplications(ConnectionInterface $db, int $userId): array
    {
        return $this->many(
            $db,
            "SELECT bp.id AS business_id, bp.tenant_id, bp.business_name, bp.business_slug,
                    bp.business_description, bp.primary_category_id, bp.business_phone,
                    bp.whatsapp_number, bp.business_email, bp.address_line_1, bp.address_line_2,
                    bp.city, bp.state, bp.postal_code, bp.country_code, bp.latitude, bp.longitude, bp.location_accuracy_m, bp.approval_status,
                    bp.approved_by, bp.approved_on, bp.rejection_reason, bp.publication_status,
                    t.tenant_name, t.tenant_status
             FROM BUSINESS_PROFILES bp
             INNER JOIN TENANTS t ON t.id = bp.tenant_id AND t.status = 'A'
             INNER JOIN TENANT_MEMBERSHIPS tm ON tm.tenant_id = bp.tenant_id
                AND tm.user_id = :user_id AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
             INNER JOIN USER_ROLE_ASSIGNMENTS ura ON ura.tenant_id = bp.tenant_id
                AND ura.user_id = :user_id AND ura.status = 'A'
                AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
             INNER JOIN ROLES r ON r.id = ura.role_id
                AND r.scope_type = 'TENANT' AND r.status = 'A'
                AND r.role_code = 'TENANT_OWNER'
             WHERE bp.status = 'A'
             ORDER BY bp.id DESC",
            [':user_id' => $userId],
            'getMyBusinessApplications',
        );
    }

    public function getMyBusinessApplication(ConnectionInterface $db, int $userId, int $tenantId = 0): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one(
            $db,
            "SELECT bp.id AS business_id, bp.tenant_id, bp.business_name, bp.business_slug,
                    bp.business_description, bp.primary_category_id, bp.business_phone,
                    bp.whatsapp_number, bp.business_email, bp.address_line_1, bp.address_line_2,
                    bp.city, bp.state, bp.postal_code, bp.country_code, bp.latitude, bp.longitude, bp.approval_status,
                    bp.approved_by, bp.approved_on, bp.rejection_reason, bp.publication_status,
                    t.tenant_name, t.tenant_status
             FROM BUSINESS_PROFILES bp
             INNER JOIN TENANTS t ON t.id = bp.tenant_id AND t.status = 'A'
             INNER JOIN TENANT_MEMBERSHIPS tm ON tm.tenant_id = bp.tenant_id
                AND tm.user_id = :user_id AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
             INNER JOIN USER_ROLE_ASSIGNMENTS ura ON ura.tenant_id = bp.tenant_id
                AND ura.user_id = :user_id AND ura.status = 'A'
                AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
             INNER JOIN ROLES r ON r.id = ura.role_id
                AND r.scope_type = 'TENANT' AND r.status = 'A'
             WHERE bp.status = 'A'
                AND (:tenant_id_filter = 0 OR bp.tenant_id = :tenant_id_match)
                AND (:owner_only = 0 OR r.role_code = 'TENANT_OWNER')
             ORDER BY bp.id DESC LIMIT 1",
            [':user_id' => $userId, ':tenant_id_filter' => $tenantId, ':tenant_id_match' => $tenantId, ':owner_only' => $tenantId === 0 ? 1 : 0],
            'getMyBusinessApplication',
        );
    }

    public function updateBusinessApplication(
        ConnectionInterface $db,
        int $tenantId,
        int $businessId,
        int $userId,
        string $businessName,
        string $businessSlug,
        string $businessDescription,
        ?int $categoryId,
        string $businessPhone,
        string $whatsappNumber,
        string $businessEmail,
        string $addressLine1,
        string $addressLine2,
        string $city,
        string $state,
        string $postalCode,
        string $countryCode,
        ?float $latitude,
        ?float $longitude,
        ?float $locationAccuracyM,
        bool $resubmit,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $sql = "UPDATE BUSINESS_PROFILES
                    SET business_name = :business_name, business_slug = :business_slug,
                        business_description = :description, primary_category_id = :category_id,
                        business_phone = :phone, whatsapp_number = :whatsapp,
                        business_email = :email, address_line_1 = :address1,
                        address_line_2 = :address2, city = :city, state = :state,
                        postal_code = :postal, country_code = :country,
                        latitude = :latitude, longitude = :longitude,
                        location_accuracy_m = :location_accuracy_m,
                        approval_status = CASE WHEN :resubmit = 1 THEN 'PENDING' ELSE approval_status END,
                        rejection_reason = CASE WHEN :resubmit = 1 THEN NULL ELSE rejection_reason END,
                        approved_by = CASE WHEN :resubmit = 1 THEN NULL ELSE approved_by END,
                        approved_on = CASE WHEN :resubmit = 1 THEN NULL ELSE approved_on END,
                        publication_status = CASE WHEN :resubmit = 1 THEN 'DRAFT' ELSE publication_status END,
                        updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                    WHERE id = :business_id AND tenant_id = :tenant_id
                        AND approval_status IN ('PENDING', 'REJECTED') AND status = 'A'";
            $affected = $db->createCommand($sql, [
                ':business_name' => $businessName, ':business_slug' => $businessSlug,
                ':description' => $businessDescription, ':category_id' => $categoryId,
                ':phone' => $businessPhone, ':whatsapp' => $whatsappNumber, ':email' => $businessEmail,
                ':address1' => $addressLine1, ':address2' => $addressLine2, ':city' => $city,
                ':state' => $state, ':postal' => $postalCode, ':country' => $countryCode,
                ':latitude' => $latitude, ':longitude' => $longitude,
                ':location_accuracy_m' => $locationAccuracyM,
                ':resubmit => $resubmit ? 1 : 0, ':user_id' => $userId,
                ':business_id' => $businessId, ':tenant_id' => $tenantId,
            ])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Business application is not editable in its current state.';
                return $resArr;
            }
            $db->createCommand(
                "UPDATE TENANTS SET tenant_name = :tenant_name, tenant_status = 'PENDING',
                    updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                 WHERE id = :tenant_id AND status = 'A'",
                [':tenant_name' => $businessName, ':user_id' => $userId, ':tenant_id' => $tenantId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $businessId];
        } catch (Throwable $exception) {
            return $this->error('updateBusinessApplication', $exception);
        }
        return $resArr;
    }

    public function updateBusinessProfile(
        ConnectionInterface $db,
        int $tenantId,
        int $businessId,
        int $userId,
        string $businessName,
        string $businessDescription,
        string $businessPhone,
        string $whatsappNumber,
        string $businessEmail,
        string $addressLine1,
        string $addressLine2,
        string $city,
        string $state,
        string $postalCode,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand(
                "UPDATE BUSINESS_PROFILES
                 SET business_name = :business_name, business_description = :description,
                     business_phone = :phone, whatsapp_number = :whatsapp, business_email = :email,
                     address_line_1 = :address1, address_line_2 = :address2,
                     city = :city, state = :state, postal_code = :postal,
                     updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                 WHERE id = :business_id AND tenant_id = :tenant_id
                    AND approval_status = 'APPROVED' AND status = 'A'",
                [
                    ':business_name' => $businessName, ':description' => $businessDescription,
                    ':phone' => $businessPhone, ':whatsapp' => $whatsappNumber, ':email' => $businessEmail,
                    ':address1' => $addressLine1, ':address2' => $addressLine2,
                    ':city' => $city, ':state' => $state, ':postal' => $postalCode,
                    ':user_id' => $userId, ':business_id' => $businessId, ':tenant_id' => $tenantId,
                ],
            )->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Approved business profile was not found.';
                return $resArr;
            }
            $db->createCommand(
                "UPDATE TENANTS SET tenant_name = :tenant_name, updated_by = :user_id
                 WHERE id = :tenant_id AND status = 'A'",
                [':tenant_name' => $businessName, ':user_id' => $userId, ':tenant_id' => $tenantId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $businessId];
        } catch (Throwable $exception) {
            return $this->error('updateBusinessProfile', $exception);
        }
        return $resArr;
    }

    public function getStorefrontSettings(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT ss.id, ss.tenant_id, ss.storefront_title, ss.storefront_description,
            ss.theme_code, ss.show_prices, ss.accept_online_orders, ss.whatsapp_enabled,
            ss.storefront_status, bp.whatsapp_number, bp.publication_status, bp.approval_status
            FROM STOREFRONT_SETTINGS ss
            INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = ss.tenant_id AND bp.status = 'A'
            WHERE ss.tenant_id = :tenant_id AND ss.status = 'A' LIMIT 1",
            [':tenant_id' => $tenantId], 'getStorefrontSettings');
    }

    public function updateStorefrontSettings(
        ConnectionInterface $db,
        int $tenantId,
        int $userId,
        ?string $title,
        ?string $description,
        ?string $themeCode,
        int $showPrices,
        int $acceptOnlineOrders,
        int $whatsappEnabled,
    ): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE STOREFRONT_SETTINGS
                SET storefront_title = :title, storefront_description = :description,
                    theme_code = :theme_code, show_prices = :show_prices,
                    accept_online_orders = :accept_online_orders, whatsapp_enabled = :whatsapp_enabled,
                    updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND status = 'A'",
                [':title' => $title, ':description' => $description, ':theme_code' => $themeCode,
                 ':show_prices' => $showPrices, ':accept_online_orders' => $acceptOnlineOrders,
                 ':whatsapp_enabled' => $whatsappEnabled, ':user_id' => $userId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $exists = $db->createCommand(
                    "SELECT id FROM STOREFRONT_SETTINGS WHERE tenant_id = :tenant_id AND status = 'A' LIMIT 1",
                    [':tenant_id' => $tenantId],
                )->queryOne();
                if (!is_array($exists)) {
                    $resArr['msgArr'][] = 'Storefront settings were not found.';
                    return $resArr;
                }
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['tenant_id' => $tenantId];
        } catch (Throwable $exception) {
            return $this->error('updateStorefrontSettings', $exception);
        }
        return $resArr;
    }

    public function updateWhatsAppNumber(ConnectionInterface $db, int $tenantId, int $userId, ?string $whatsappNumber): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $affected = $db->createCommand("UPDATE BUSINESS_PROFILES
                SET whatsapp_number = :whatsapp_number, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND approval_status = 'APPROVED' AND status = 'A'",
                [':whatsapp_number' => $whatsappNumber, ':user_id' => $userId, ':tenant_id' => $tenantId])->execute();
            if ($affected !== 1) {
                $exists = $db->createCommand(
                    "SELECT id FROM BUSINESS_PROFILES WHERE tenant_id = :tenant_id
                        AND approval_status = 'APPROVED' AND status = 'A' LIMIT 1",
                    [':tenant_id' => $tenantId],
                )->queryOne();
                if (!is_array($exists)) {
                    $resArr['msgArr'][] = 'Approved business profile was not found.';
                    return $resArr;
                }
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['tenant_id' => $tenantId];
        } catch (Throwable $exception) {
            return $this->error('updateWhatsAppNumber', $exception);
        }
        return $resArr;
    }

    public function setStorefrontPublication(ConnectionInterface $db, int $tenantId, int $userId, bool $publish): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $publicationStatus = $publish ? 'PUBLISHED' : 'DRAFT';
            $storefrontStatus = $publish ? 'ACTIVE' : 'INACTIVE';
            $profileAffected = $db->createCommand("UPDATE BUSINESS_PROFILES
                SET publication_status = :publication_status, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND approval_status = 'APPROVED' AND status = 'A'",
                [':publication_status' => $publicationStatus, ':user_id' => $userId, ':tenant_id' => $tenantId])->execute();
            if ($profileAffected !== 1) {
                $profileExists = $db->createCommand(
                    "SELECT id FROM BUSINESS_PROFILES WHERE tenant_id = :tenant_id
                        AND approval_status = 'APPROVED' AND status = 'A' LIMIT 1",
                    [':tenant_id' => $tenantId],
                )->queryOne();
                if (!is_array($profileExists)) {
                    $resArr['msgArr'][] = 'Only an approved business can publish its storefront.';
                    return $resArr;
                }
            }
            $storefrontAffected = $db->createCommand("UPDATE STOREFRONT_SETTINGS
                SET storefront_status = :storefront_status, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                WHERE tenant_id = :tenant_id AND status = 'A'",
                [':storefront_status' => $storefrontStatus, ':user_id' => $userId, ':tenant_id' => $tenantId])->execute();
            if ($storefrontAffected !== 1) {
                $storefrontExists = $db->createCommand(
                    "SELECT id FROM STOREFRONT_SETTINGS WHERE tenant_id = :tenant_id AND status = 'A' LIMIT 1",
                    [':tenant_id' => $tenantId],
                )->queryOne();
                if (!is_array($storefrontExists)) {
                    $resArr['msgArr'][] = 'Storefront settings were not found.';
                    return $resArr;
                }
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['tenant_id' => $tenantId, 'publication_status' => $publicationStatus, 'storefront_status' => $storefrontStatus];
        } catch (Throwable $exception) {
            return $this->error('setStorefrontPublication', $exception);
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

    private function error(string $operation, Throwable $exception): array
    {
        $resArr = ['status' => 'EXCEPTION', 'msgArr' => [], 'data' => []];
        $this->logger->error('BusinessDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Business data operation failed.';
        return $resArr;
    }
}
