<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class EnquiryDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function getCustomerIdentity(ConnectionInterface $db, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM CUSTOMER_IDENTITIES
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

    public function getEligibleTenant(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT t.id FROM TENANTS t
            INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = t.id
                AND bp.approval_status = 'APPROVED' AND bp.publication_status = 'PUBLISHED' AND bp.status = 'A'
            INNER JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id = t.id
                AND ss.storefront_status = 'ACTIVE' AND ss.status = 'A'
            WHERE t.id = :tenant_id AND t.tenant_status = 'ACTIVE' AND t.status = 'A'
            LIMIT 1", [':tenant_id' => $tenantId], 'getEligibleTenant');
    }

    public function insertEnquiry(ConnectionInterface $db, int $tenantId, int $identityId, string $number, string $subject, string $message, int $userId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CUSTOMER_ENQUIRIES
                (tenant_id, customer_identity_id, enquiry_number, subject, message,
                 enquiry_status, status, created_by, updated_by)
                VALUES (:tenant_id, :identity_id, :number, :subject, :message,
                 'PENDING', 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':identity_id' => $identityId, ':number' => $number,
                 ':subject' => $subject, ':message' => $message, ':user_id' => $userId])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertEnquiry', $exception);
        }
        return $resArr;
    }

    public function insertMessage(ConnectionInterface $db, int $tenantId, int $enquiryId, int $userId, string $senderType, string $message): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO ENQUIRY_MESSAGES
                (tenant_id, enquiry_id, sender_user_id, sender_type, message, sent_on, status, created_by, updated_by)
                VALUES (:tenant_id, :enquiry_id, :user_id, :sender_type, :message, CURRENT_TIMESTAMP, 'A', :user_id, :user_id)",
                [':tenant_id' => $tenantId, ':enquiry_id' => $enquiryId, ':user_id' => $userId,
                 ':sender_type' => $senderType, ':message' => $message])->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $db->getLastInsertId()];
        } catch (Throwable $exception) {
            return $this->error('insertMessage', $exception);
        }
        return $resArr;
    }

    public function getMyEnquiries(ConnectionInterface $db, int $identityId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT e.id, e.tenant_id, e.enquiry_number, e.subject,
            e.enquiry_status, e.responded_on, e.closed_on, e.created_on,
            bp.business_name, bp.business_slug
            FROM CUSTOMER_ENQUIRIES e
            INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = e.tenant_id AND bp.status = 'A'
            WHERE e.customer_identity_id = :identity_id AND e.status = 'A'
            ORDER BY e.created_on DESC, e.id DESC LIMIT :limit OFFSET :offset",
            [':identity_id' => $identityId, ':limit' => $limit, ':offset' => $offset], 'getMyEnquiries');
    }

    public function countMyEnquiries(ConnectionInterface $db, int $identityId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM CUSTOMER_ENQUIRIES
            WHERE customer_identity_id = :identity_id AND status = 'A'",
            [':identity_id' => $identityId], 'countMyEnquiries');
    }

    public function getMyEnquiry(ConnectionInterface $db, int $identityId, int $enquiryId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT e.id, e.tenant_id, e.enquiry_number, e.subject, e.message,
            e.enquiry_status, e.responded_on, e.closed_on, e.created_on,
            bp.business_name, bp.business_slug
            FROM CUSTOMER_ENQUIRIES e
            INNER JOIN BUSINESS_PROFILES bp ON bp.tenant_id = e.tenant_id AND bp.status = 'A'
            WHERE e.id = :id AND e.customer_identity_id = :identity_id AND e.status = 'A'
            LIMIT 1", [':id' => $enquiryId, ':identity_id' => $identityId], 'getMyEnquiry');
    }

    public function getTenantEnquiries(ConnectionInterface $db, int $tenantId, int $limit, int $offset): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT e.id, e.enquiry_number, e.subject, e.enquiry_status,
            e.responded_on, e.closed_on, e.created_on, ci.full_name AS customer_name,
            ci.email AS customer_email, ci.mobile AS customer_mobile
            FROM CUSTOMER_ENQUIRIES e
            LEFT JOIN CUSTOMER_IDENTITIES ci ON ci.id = e.customer_identity_id AND ci.status = 'A'
            WHERE e.tenant_id = :tenant_id AND e.status = 'A'
            ORDER BY e.created_on DESC, e.id DESC LIMIT :limit OFFSET :offset",
            [':tenant_id' => $tenantId, ':limit' => $limit, ':offset' => $offset], 'getTenantEnquiries');
    }

    public function countTenantEnquiries(ConnectionInterface $db, int $tenantId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT COUNT(*) AS total FROM CUSTOMER_ENQUIRIES
            WHERE tenant_id = :tenant_id AND status = 'A'", [':tenant_id' => $tenantId], 'countTenantEnquiries');
    }

    public function getTenantEnquiry(ConnectionInterface $db, int $tenantId, int $enquiryId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT e.id, e.tenant_id, e.customer_identity_id, e.enquiry_number,
            e.subject, e.message, e.enquiry_status, e.responded_on, e.closed_on, e.created_on,
            ci.full_name AS customer_name, ci.email AS customer_email, ci.mobile AS customer_mobile
            FROM CUSTOMER_ENQUIRIES e
            LEFT JOIN CUSTOMER_IDENTITIES ci ON ci.id = e.customer_identity_id AND ci.status = 'A'
            WHERE e.id = :id AND e.tenant_id = :tenant_id AND e.status = 'A' LIMIT 1",
            [':id' => $enquiryId, ':tenant_id' => $tenantId], 'getTenantEnquiry');
    }

    public function getMessages(ConnectionInterface $db, int $tenantId, int $enquiryId): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->many($db, "SELECT id, sender_user_id, sender_type, message, sent_on
            FROM ENQUIRY_MESSAGES
            WHERE tenant_id = :tenant_id AND enquiry_id = :enquiry_id AND status = 'A'
            ORDER BY sent_on ASC, id ASC",
            [':tenant_id' => $tenantId, ':enquiry_id' => $enquiryId], 'getMessages');
    }

    public function updateEnquiryStatus(ConnectionInterface $db, int $tenantId, int $enquiryId, int $userId, string $oldStatus, string $newStatus): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $timestamps = match ($newStatus) {
                'RESPONDED' => ', responded_on = CURRENT_TIMESTAMP',
                'CLOSED' => ', closed_on = CURRENT_TIMESTAMP',
                default => '',
            };
            $affected = $db->createCommand("UPDATE CUSTOMER_ENQUIRIES
                SET enquiry_status = :new_status, updated_by = :user_id, updated_on = CURRENT_TIMESTAMP" . $timestamps . "
                WHERE id = :id AND tenant_id = :tenant_id AND enquiry_status = :old_status AND status = 'A'",
                [':new_status' => $newStatus, ':user_id' => $userId, ':id' => $enquiryId,
                 ':tenant_id' => $tenantId, ':old_status' => $oldStatus])->execute();
            if ($affected !== 1) {
                $resArr['msgArr'][] = 'Enquiry status changed before this action could be completed.';
                return $resArr;
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $enquiryId];
        } catch (Throwable $exception) {
            return $this->error('updateEnquiryStatus', $exception);
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
        $this->logger->error('EnquiryDao::' . $operation . ' failed.', ['exception' => $exception]);
        $resArr['msgArr'][] = 'Enquiry data operation failed.';
        return $resArr;
    }
}
