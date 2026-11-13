<?php

declare(strict_types=1);

namespace App\Dao;

use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class AuthDao
{
    public function __construct(private LoggerInterface $logger) {}

    public function isEmailAvailableForUser(ConnectionInterface $connection, string $email, int $userId): array
    {
        $resArr = $this->initialResponse();
        try {
            $row = $connection->createCommand(
                "SELECT id FROM USERS WHERE LOWER(email) = :email AND id <> :user_id AND status = 'A' LIMIT 1",
                [':email' => strtolower($email), ':user_id' => $userId],
            )->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logException('isEmailAvailableForUser', $exception);
            $resArr = $this->exceptionResponse('Unable to validate email uniqueness.');
        }
        return $resArr;
    }

    public function isMobileAvailableForUser(ConnectionInterface $connection, string $mobile, int $userId): array
    {
        $resArr = $this->initialResponse();
        try {
            $row = $connection->createCommand(
                "SELECT id FROM USERS WHERE mobile = :mobile AND id <> :user_id AND status = 'A' LIMIT 1",
                [':mobile' => $mobile, ':user_id' => $userId],
            )->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logException('isMobileAvailableForUser', $exception);
            $resArr = $this->exceptionResponse('Unable to validate mobile uniqueness.');
        }
        return $resArr;
    }

    public function updateUserProfile(ConnectionInterface $connection, int $userId, string $fullName, ?string $email, ?string $mobile): array
    {
        $resArr = $this->initialResponse();
        try {
            $affected = $connection->createCommand(
                "UPDATE USERS SET full_name = :full_name, email = :email, mobile = :mobile,
                    updated_by = :user_id, updated_on = CURRENT_TIMESTAMP
                 WHERE id = :id AND account_status = 'ACTIVE' AND status = 'A'",
                [':full_name' => $fullName, ':email' => $email, ':mobile' => $mobile,
                 ':user_id' => $userId, ':id' => $userId],
            )->execute();
            if ($affected !== 1) {
                $exists = $connection->createCommand(
                    "SELECT id FROM USERS WHERE id = :user_id AND account_status = 'ACTIVE' AND status = 'A' LIMIT 1",
                    [':user_id' => $userId],
                )->queryOne();
                if (!is_array($exists)) {
                    $resArr['msgArr'][] = 'Active user profile was not found.';
                    return $resArr;
                }
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['user_id' => $userId];
        } catch (Throwable $exception) {
            $this->logException('updateUserProfile', $exception);
            $resArr = $this->exceptionResponse('Unable to update user profile.');
        }
        return $resArr;
    }

    public function getUserPermissions(ConnectionInterface $connection, int $userId, int $tenantId): array
    {
        $resArr = $this->initialResponse();
        try {
            $rows = $connection->createCommand(
                "SELECT DISTINCT r.role_code, r.scope_type, p.permission_code, p.module_code
                 FROM USER_ROLE_ASSIGNMENTS ura
                 INNER JOIN ROLES r ON r.id = ura.role_id AND r.status = 'A'
                 INNER JOIN ROLE_PERMISSIONS rp ON rp.role_id = r.id AND rp.status = 'A'
                 INNER JOIN PERMISSIONS p ON p.id = rp.permission_id AND p.status = 'A'
                 WHERE ura.user_id = :user_id AND ura.status = 'A'
                    AND (ura.expires_on IS NULL OR ura.expires_on > CURRENT_TIMESTAMP)
                    AND (
                        (:tenant_filter = 0 AND ura.tenant_id IS NULL AND r.scope_type = 'PLATFORM')
                        OR
                        (:tenant_filter_match > 0 AND ura.tenant_id = :tenant_id
                            AND r.scope_type = 'TENANT'
                            AND EXISTS (
                                SELECT 1 FROM TENANT_MEMBERSHIPS tm
                                WHERE tm.user_id = ura.user_id AND tm.tenant_id = ura.tenant_id
                                    AND tm.membership_status = 'ACTIVE' AND tm.status = 'A'
                            )
                        )
                    )
                 ORDER BY r.role_code ASC, p.module_code ASC, p.permission_code ASC",
                [':user_id' => $userId, ':tenant_filter' => $tenantId,
                 ':tenant_filter_match' => $tenantId, ':tenant_id' => $tenantId],
            )->queryAll();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($rows) ? $rows : [];
        } catch (Throwable $exception) {
            $this->logException('getUserPermissions', $exception);
            $resArr = $this->exceptionResponse('Unable to read user permissions.');
        }
        return $resArr;
    }

    public function getUserByIdentifier(ConnectionInterface $connection, string $identifier): array
    {
        $resArr = $this->initialResponse();
        try {
            $row = $connection->createCommand(
                "SELECT id, full_name, email, mobile, password_hash, profile_image, account_status, status
                 FROM USERS
                 WHERE status = 'A' AND (LOWER(email) = :email OR mobile = :mobile)
                 LIMIT 1",
                [':email' => strtolower($identifier), ':mobile' => $identifier],
            )->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logException('getUserByIdentifier', $exception);
            $resArr = $this->exceptionResponse('Unable to read user account.');
        }
        return $resArr;
    }

    public function getUserByIdentifierForUniqueness(ConnectionInterface $connection, string $identifier): array
    {
        $resArr = $this->initialResponse();
        try {
            $row = $connection->createCommand(
                "SELECT id FROM USERS WHERE LOWER(email) = :email OR mobile = :mobile LIMIT 1",
                [':email' => strtolower($identifier), ':mobile' => $identifier],
            )->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logException('getUserByIdentifierForUniqueness', $exception);
            $resArr = $this->exceptionResponse('Unable to validate account uniqueness.');
        }
        return $resArr;
    }

    public function getUserById(ConnectionInterface $connection, int $userId): array
    {
        $resArr = $this->initialResponse();
        try {
            $row = $connection->createCommand(
                "SELECT id, full_name, email, mobile, profile_image, account_status, status
                 FROM USERS WHERE id = :id AND status = 'A' LIMIT 1",
                [':id' => $userId],
            )->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logException('getUserById', $exception);
            $resArr = $this->exceptionResponse('Unable to read user account.');
        }
        return $resArr;
    }

    public function insertUser(
        ConnectionInterface $connection,
        string $fullName,
        ?string $email,
        ?string $mobile,
        string $passwordHash,
    ): array {
        $resArr = $this->initialResponse();
        try {
            $connection->createCommand(
                "INSERT INTO USERS
                    (full_name, email, mobile, password_hash, account_status, status, created_by, updated_by)
                 VALUES
                    (:full_name, :email, :mobile, :password_hash, 'ACTIVE', 'A', NULL, NULL)",
                [
                    ':full_name' => $fullName,
                    ':email' => $email,
                    ':mobile' => $mobile,
                    ':password_hash' => $passwordHash,
                ],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $connection->getLastInsertId()];
        } catch (Throwable $exception) {
            $this->logException('insertUser', $exception);
            $resArr = $this->exceptionResponse('Unable to create user account.');
        }
        return $resArr;
    }

    public function updateLastLogin(ConnectionInterface $connection, int $userId, string $lastLoginOn): array
    {
        $resArr = $this->initialResponse();
        try {
            $connection->createCommand(
                "UPDATE USERS SET last_login_on = :last_login_on, updated_by = :updated_by
                 WHERE id = :id AND status = 'A'",
                [':last_login_on' => $lastLoginOn, ':updated_by' => $userId, ':id' => $userId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $userId];
        } catch (Throwable $exception) {
            $this->logException('updateLastLogin', $exception);
            $resArr = $this->exceptionResponse('Unable to update login timestamp.');
        }
        return $resArr;
    }

    public function insertSession(
        ConnectionInterface $connection,
        int $userId,
        string $sessionUuid,
        string $refreshTokenHash,
        string $tokenFamilyId,
        ?string $deviceName,
        ?string $ipAddress,
        ?string $userAgent,
        string $issuedOn,
        string $expiresOn,
    ): array {
        $resArr = $this->initialResponse();
        try {
            $connection->createCommand(
                "INSERT INTO USER_SESSIONS
                    (user_id, session_uuid, refresh_token_hash, token_family_id, device_name, ip_address,
                     user_agent, issued_on, expires_on, last_used_on, revoked_on, replaced_by_session_id,
                     status, created_by, updated_by)
                 VALUES
                    (:user_id, :session_uuid, :refresh_token_hash, :token_family_id, :device_name, :ip_address,
                     :user_agent, :issued_on, :expires_on, :last_used_on, NULL, NULL,
                     'A', :created_by, :updated_by)",
                [
                    ':user_id' => $userId,
                    ':session_uuid' => $sessionUuid,
                    ':refresh_token_hash' => $refreshTokenHash,
                    ':token_family_id' => $tokenFamilyId,
                    ':device_name' => $deviceName,
                    ':ip_address' => $ipAddress,
                    ':user_agent' => $userAgent,
                    ':issued_on' => $issuedOn,
                    ':expires_on' => $expiresOn,
                    ':last_used_on' => $issuedOn,
                    ':created_by' => $userId,
                    ':updated_by' => $userId,
                ],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $connection->getLastInsertId()];
        } catch (Throwable $exception) {
            $this->logException('insertSession', $exception);
            $resArr = $this->exceptionResponse('Unable to create login session.');
        }
        return $resArr;
    }

    public function getSessionByRefreshHash(
        ConnectionInterface $connection,
        string $refreshTokenHash,
        bool $forUpdate = false,
    ): array {
        $resArr = $this->initialResponse();
        try {
            $sql = "SELECT id, user_id, session_uuid, refresh_token_hash, token_family_id, expires_on,
                           revoked_on, replaced_by_session_id, status
                    FROM USER_SESSIONS WHERE refresh_token_hash = :refresh_token_hash LIMIT 1";
            if ($forUpdate) {
                $sql .= ' FOR UPDATE';
            }
            $row = $connection->createCommand($sql, [':refresh_token_hash' => $refreshTokenHash])->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logException('getSessionByRefreshHash', $exception);
            $resArr = $this->exceptionResponse('Unable to validate login session.');
        }
        return $resArr;
    }

    public function getSessionByUuid(ConnectionInterface $connection, string $sessionUuid): array
    {
        $resArr = $this->initialResponse();
        try {
            $row = $connection->createCommand(
                "SELECT id, user_id, session_uuid, token_family_id, expires_on, revoked_on, status
                 FROM USER_SESSIONS WHERE session_uuid = :session_uuid AND status = 'A' LIMIT 1",
                [':session_uuid' => $sessionUuid],
            )->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logException('getSessionByUuid', $exception);
            $resArr = $this->exceptionResponse('Unable to validate login session.');
        }
        return $resArr;
    }

    public function markSessionRotated(
        ConnectionInterface $connection,
        int $sessionId,
        int $replacementSessionId,
        int $userId,
        string $revokedOn,
    ): array {
        $resArr = $this->initialResponse();
        try {
            $connection->createCommand(
                "UPDATE USER_SESSIONS
                 SET revoked_on = :revoked_on, replaced_by_session_id = :replacement_id,
                     last_used_on = :last_used_on, updated_by = :updated_by
                 WHERE id = :id AND revoked_on IS NULL AND status = 'A'",
                [
                    ':revoked_on' => $revokedOn,
                    ':replacement_id' => $replacementSessionId,
                    ':last_used_on' => $revokedOn,
                    ':updated_by' => $userId,
                    ':id' => $sessionId,
                ],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $sessionId];
        } catch (Throwable $exception) {
            $this->logException('markSessionRotated', $exception);
            $resArr = $this->exceptionResponse('Unable to rotate login session.');
        }
        return $resArr;
    }

    public function revokeTokenFamily(
        ConnectionInterface $connection,
        string $tokenFamilyId,
        int $userId,
        string $revokedOn,
    ): array {
        $resArr = $this->initialResponse();
        try {
            $connection->createCommand(
                "UPDATE USER_SESSIONS
                 SET revoked_on = COALESCE(revoked_on, :revoked_on), updated_by = :updated_by
                 WHERE token_family_id = :token_family_id AND status = 'A'",
                [':revoked_on' => $revokedOn, ':updated_by' => $userId, ':token_family_id' => $tokenFamilyId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = [];
        } catch (Throwable $exception) {
            $this->logException('revokeTokenFamily', $exception);
            $resArr = $this->exceptionResponse('Unable to revoke login session.');
        }
        return $resArr;
    }

    public function revokeUserSessions(ConnectionInterface $connection, int $userId, string $revokedOn): array
    {
        $resArr = $this->initialResponse();
        try {
            $connection->createCommand(
                "UPDATE USER_SESSIONS
                 SET revoked_on = COALESCE(revoked_on, :revoked_on), updated_by = :updated_by
                 WHERE user_id = :user_id AND status = 'A'",
                [':revoked_on' => $revokedOn, ':updated_by' => $userId, ':user_id' => $userId],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = [];
        } catch (Throwable $exception) {
            $this->logException('revokeUserSessions', $exception);
            $resArr = $this->exceptionResponse('Unable to revoke user sessions.');
        }
        return $resArr;
    }

    private function initialResponse(): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $resArr;
    }

    private function exceptionResponse(string $message): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $resArr['status'] = 'EXCEPTION';
        $resArr['msgArr'][] = $message;
        return $resArr;
    }

    private function logException(string $operation, Throwable $exception): void
    {
        $this->logger->error('AuthDao::' . $operation . ' failed.', ['exception' => $exception]);
    }

    public function getUserIdentity(ConnectionInterface $connection, string $provider, string $providerSubject): array
    {
        $resArr = $this->initialResponse();
        try {
            $row = $connection->createCommand(
                "SELECT id, user_id, provider, provider_subject, provider_email, status
                 FROM USER_IDENTITIES
                 WHERE provider = :provider AND provider_subject = :provider_subject
                 LIMIT 1",
                [':provider' => $provider, ':provider_subject' => $providerSubject],
            )->queryOne();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = is_array($row) ? $row : [];
        } catch (Throwable $exception) {
            $this->logException('getUserIdentity', $exception);
            $resArr = $this->exceptionResponse('Unable to read social identity.');
        }
        return $resArr;
    }

    public function insertSocialUser(
        ConnectionInterface $connection,
        string $fullName,
        ?string $email,
        ?string $mobile,
        ?string $profileImage,
        bool $emailVerified,
    ): array {
        $resArr = $this->initialResponse();
        try {
            $connection->createCommand(
                "INSERT INTO USERS
                    (full_name, email, mobile, password_hash, profile_image, email_verified_on,
                     account_status, status, created_by, updated_by)
                 VALUES
                    (:full_name, :email, :mobile, NULL, :profile_image,
                     CASE WHEN :email_verified = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
                     'ACTIVE', 'A', NULL, NULL)",
                [
                    ':full_name' => $fullName,
                    ':email' => $email,
                    ':mobile' => $mobile,
                    ':profile_image' => $profileImage,
                    ':email_verified' => $emailVerified ? 1 : 0,
                ],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $connection->getLastInsertId()];
        } catch (Throwable $exception) {
            $this->logException('insertSocialUser', $exception);
            $resArr = $this->exceptionResponse('Unable to create social account.');
        }
        return $resArr;
    }

    public function insertUserIdentity(
        ConnectionInterface $connection,
        int $userId,
        string $provider,
        string $providerSubject,
        ?string $providerEmail,
    ): array {
        $resArr = $this->initialResponse();
        try {
            $connection->createCommand(
                "INSERT INTO USER_IDENTITIES
                    (user_id, provider, provider_subject, provider_email, linked_on,
                     status, created_by, updated_by)
                 VALUES
                    (:user_id, :provider, :provider_subject, :provider_email, CURRENT_TIMESTAMP,
                     'A', :created_by, :updated_by)",
                [
                    ':user_id' => $userId,
                    ':provider' => $provider,
                    ':provider_subject' => $providerSubject,
                    ':provider_email' => $providerEmail,
                    ':created_by' => $userId,
                    ':updated_by' => $userId,
                ],
            )->execute();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => (int) $connection->getLastInsertId()];
        } catch (Throwable $exception) {
            $this->logException('insertUserIdentity', $exception);
            $resArr = $this->exceptionResponse('Unable to link social identity.');
        }
        return $resArr;
    }


}
