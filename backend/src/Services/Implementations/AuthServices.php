<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\AuthDao;
use App\Services\Interfaces\IAuthServices;
use App\Utils\AuthTokenService;
use DateTimeImmutable;
use DateTimeZone;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class AuthServices implements IAuthServices
{
    public function __construct(
        private ConnectionInterface $connection,
        private AuthDao $authDao,
        private AuthTokenService $tokenService,
        private LoggerInterface $logger,
    ) {}

    public function getAuth(array $authParam): array
    {
        $resArr = $this->initialResponse();
        if (($validation = $this->validateEnvelope($authParam, 'getAuth')) !== null) {
            return $validation;
        }
        if ($authParam['actionType'] !== 'getAuth') {
            return $this->failed('Unsupported actionType for getAuth.');
        }

        $actionData = $authParam['actionData'];
        return match ($actionData['action'] ?? '') {
            'getProfile' => $this->getUserProfile($actionData),
            'getPrincipal' => $this->resolvePrincipal((string) ($actionData['_accessToken'] ?? '')),
            'getPermissions' => $this->getUserPermissions($actionData),
            default => $this->failed('Unsupported authentication read action.'),
        };
    }

    public function manageAuth(array $authParam): array
    {
        $resArr = $this->initialResponse();
        if (($validation = $this->validateEnvelope($authParam, 'manageAuth')) !== null) {
            return $validation;
        }
        if ($authParam['actionType'] !== 'manageAuth') {
            return $this->failed('Unsupported actionType for manageAuth.');
        }

        $actionData = $authParam['actionData'];
        return match ($actionData['action'] ?? '') {
            'register' => $this->manageRegistration($actionData),
            'login' => $this->manageLogin($actionData),
            'refresh' => $this->manageRefreshSession($actionData),
            'logout' => $this->manageLogoutSession($actionData),
            'logoutAll' => $this->manageLogoutAllSessions($actionData),
            'updateProfile' => $this->manageUserProfile($actionData),
            default => $this->failed('Unsupported authentication management action.'),
        };
    }

    private function manageRegistration(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $fullName = trim((string) ($actionData['full_name'] ?? ''));
        $email = trim(strtolower((string) ($actionData['email'] ?? '')));
        $mobile = trim((string) ($actionData['mobile'] ?? ''));
        $password = (string) ($actionData['password'] ?? '');

        if ($fullName === '' || strlen($fullName) > 150 || ($email === '' && $mobile === '')
            || strlen($email) > 190 || strlen($mobile) > 25 || strlen($password) < 8
        ) {
            return $this->failed('Full name, email or mobile, and a password of at least 8 characters are required.');
        }
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return $this->failed('A valid email address is required.');
        }

        try {
            foreach (array_filter([$email, $mobile]) as $identifier) {
                $existing = $this->authDao->getUserByIdentifierForUniqueness($this->connection, $identifier);
                if ($existing['status'] !== 'SUCCESS') {
                    return $this->propagateFailure($existing, 'AuthServices::manageRegistration');
                }
                if ($existing['data'] !== []) {
                    return $this->failed('An account with the supplied email or mobile already exists.');
                }
            }

            $resArr = $this->authDao->insertUser(
                $this->connection,
                $fullName,
                $email !== '' ? $email : null,
                $mobile !== '' ? $mobile : null,
                password_hash($password, PASSWORD_DEFAULT),
            );
            if ($resArr['status'] !== 'SUCCESS') {
                return $this->propagateFailure($resArr, 'AuthServices::manageRegistration');
            }
            $resArr['msgArr'][] = 'Account created successfully.';
            return $resArr;
        } catch (Throwable $exception) {
            return $this->exception('manageRegistration', $exception);
        }
    }

    private function manageLogin(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $identifier = trim((string) ($actionData['identifier'] ?? $actionData['email'] ?? ''));
        $password = (string) ($actionData['password'] ?? '');
        if ($identifier === '' || $password === '') {
            return $this->failed('Email/mobile and password are required.');
        }

        try {
            $this->tokenService->assertConfigured();
            $userResult = $this->authDao->getUserByIdentifier($this->connection, $identifier);
            if ($userResult['status'] !== 'SUCCESS') {
                return $this->propagateFailure($userResult, 'AuthServices::manageLogin');
            }
            $user = $userResult['data'];
            if ($user === [] || ($user['account_status'] ?? '') !== 'ACTIVE'
                || !password_verify($password, (string) ($user['password_hash'] ?? ''))
            ) {
                return $this->failed('Invalid credentials or inactive account.');
            }

            return $this->createSession((int) $user['id'], $this->publicUser($user), true, $actionData);
        } catch (Throwable $exception) {
            return $this->exception('manageLogin', $exception);
        }
    }

    private function createSession(int $userId, array $publicUser, bool $updateLastLogin, array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $now = $this->utcNow();
        $sessionUuid = $this->uuid();
        $tokenFamilyId = $this->uuid();
        $refreshToken = $this->tokenService->generateRefreshToken();
        $expiresOn = $this->utcDateTime(time() + $this->tokenService->refreshTokenTtl());
        $accessToken = $this->tokenService->issueAccessToken($userId, $sessionUuid);
        $transaction = $this->connection->beginTransaction();

        try {
            $sessionResult = $this->authDao->insertSession(
                $this->connection,
                $userId,
                $sessionUuid,
                $this->tokenService->hashRefreshToken($refreshToken),
                $tokenFamilyId,
                $this->nullableString($actionData['device_name'] ?? null, 150),
                $this->nullableString($actionData['_ipAddress'] ?? null, 45),
                $this->nullableString($actionData['_userAgent'] ?? null, 500),
                $now,
                $expiresOn,
            );
            if ($sessionResult['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($sessionResult, 'AuthServices::createSession');
            }

            if ($updateLastLogin) {
                $loginResult = $this->authDao->updateLastLogin($this->connection, $userId, $now);
                if ($loginResult['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($loginResult, 'AuthServices::createSession');
                }
            }

            $transaction->commit();
            $resArr = $this->initialResponse();
            $resArr['status'] = 'SUCCESS';
            $resArr['msgArr'][] = 'Authentication successful.';
            $resArr['data'] = [
                'access_token' => $accessToken,
                'token_type' => 'Bearer',
                'expires_in' => $this->tokenService->accessTokenTtl(),
                'user' => $publicUser,
                '_refresh_token' => $refreshToken,
            ];
            return $resArr;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            return $this->exception('createSession', $exception);
        }
    }

    private function manageRefreshSession(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $refreshToken = (string) ($actionData['_refreshToken'] ?? '');
        if ($refreshToken === '') {
            return $this->failed('Refresh token cookie is missing.');
        }

        try {
            $this->tokenService->assertConfigured();
            $transaction = $this->connection->beginTransaction();
            try {
                $sessionResult = $this->authDao->getSessionByRefreshHash(
                    $this->connection,
                    $this->tokenService->hashRefreshToken($refreshToken),
                    true,
                );
                if ($sessionResult['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($sessionResult, 'AuthServices::manageRefreshSession');
                }
                $session = $sessionResult['data'];
                if ($session === []) {
                    $transaction->rollBack();
                    return $this->failed('Refresh token is invalid.');
                }

                $userId = (int) $session['user_id'];
                $tokenFamilyId = (string) $session['token_family_id'];
                $now = $this->utcNow();
                $isReused = !empty($session['revoked_on']) || !empty($session['replaced_by_session_id']);
                $isExpired = $this->isUtcDateExpired((string) $session['expires_on']);
                $isInactive = ($session['status'] ?? '') !== 'A';

                if ($isReused || $isExpired || $isInactive) {
                    $revokeResult = $this->authDao->revokeTokenFamily($this->connection, $tokenFamilyId, $userId, $now);
                    if ($revokeResult['status'] !== 'SUCCESS') {
                        $transaction->rollBack();
                        return $this->propagateFailure($revokeResult, 'AuthServices::manageRefreshSession');
                    }
                    $transaction->commit();
                    return $this->failed('Refresh session is expired, revoked or already used. The token family was revoked.');
                }

                $userResult = $this->authDao->getUserById($this->connection, $userId);
                if ($userResult['status'] !== 'SUCCESS' || $userResult['data'] === []) {
                    $transaction->rollBack();
                    return $this->failed('User account is unavailable.');
                }
                $user = $userResult['data'];
                if (($user['account_status'] ?? '') !== 'ACTIVE') {
                    $revokeResult = $this->authDao->revokeTokenFamily($this->connection, $tokenFamilyId, $userId, $now);
                    if ($revokeResult['status'] !== 'SUCCESS') {
                        $transaction->rollBack();
                        return $this->propagateFailure($revokeResult, 'AuthServices::manageRefreshSession');
                    }
                    $transaction->commit();
                    return $this->failed('User account is inactive.');
                }

                $newSessionUuid = $this->uuid();
                $newRefreshToken = $this->tokenService->generateRefreshToken();
                $accessToken = $this->tokenService->issueAccessToken($userId, $newSessionUuid);
                $newExpiresOn = $this->utcDateTime(time() + $this->tokenService->refreshTokenTtl());
                $newSessionResult = $this->authDao->insertSession(
                    $this->connection,
                    $userId,
                    $newSessionUuid,
                    $this->tokenService->hashRefreshToken($newRefreshToken),
                    $tokenFamilyId,
                    null,
                    null,
                    null,
                    $now,
                    $newExpiresOn,
                );
                if ($newSessionResult['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($newSessionResult, 'AuthServices::manageRefreshSession');
                }

                $rotateResult = $this->authDao->markSessionRotated(
                    $this->connection,
                    (int) $session['id'],
                    (int) $newSessionResult['data']['id'],
                    $userId,
                    $now,
                );
                if ($rotateResult['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($rotateResult, 'AuthServices::manageRefreshSession');
                }

                $transaction->commit();
                $resArr = $this->initialResponse();
                $resArr['status'] = 'SUCCESS';
                $resArr['msgArr'][] = 'Session refreshed successfully.';
                $resArr['data'] = [
                    'access_token' => $accessToken,
                    'token_type' => 'Bearer',
                    'expires_in' => $this->tokenService->accessTokenTtl(),
                    'user' => $this->publicUser($user),
                    '_refresh_token' => $newRefreshToken,
                ];
                return $resArr;
            } catch (Throwable $exception) {
                if ($transaction->isActive()) {
                    $transaction->rollBack();
                }
                throw $exception;
            }
        } catch (Throwable $exception) {
            return $this->exception('manageRefreshSession', $exception);
        }
    }

    private function manageLogoutSession(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $refreshToken = (string) ($actionData['_refreshToken'] ?? '');
        if ($refreshToken === '') {
            $resArr = $this->initialResponse();
            $resArr['status'] = 'SUCCESS';
            $resArr['msgArr'][] = 'No active refresh cookie was supplied; logout completed.';
            return $resArr;
        }

        try {
            $sessionResult = $this->authDao->getSessionByRefreshHash(
                $this->connection,
                $this->tokenService->hashRefreshToken($refreshToken),
            );
            if ($sessionResult['status'] !== 'SUCCESS') {
                return $this->propagateFailure($sessionResult, 'AuthServices::manageLogoutSession');
            }
            if ($sessionResult['data'] !== []) {
                $session = $sessionResult['data'];
                $revokeResult = $this->authDao->revokeTokenFamily(
                    $this->connection,
                    (string) $session['token_family_id'],
                    (int) $session['user_id'],
                    $this->utcNow(),
                );
                if ($revokeResult['status'] !== 'SUCCESS') {
                    return $this->propagateFailure($revokeResult, 'AuthServices::manageLogoutSession');
                }
            }
            $resArr = $this->initialResponse();
            $resArr['status'] = 'SUCCESS';
            $resArr['msgArr'][] = 'Logout completed.';
            return $resArr;
        } catch (Throwable $exception) {
            return $this->exception('manageLogoutSession', $exception);
        }
    }

    private function manageLogoutAllSessions(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->resolvePrincipal((string) ($actionData['_accessToken'] ?? ''));
        if ($principal['status'] !== 'SUCCESS') {
            return $principal;
        }

        $revokeResult = $this->authDao->revokeUserSessions(
            $this->connection,
            (int) $principal['data']['user_id'],
            $this->utcNow(),
        );
        if ($revokeResult['status'] !== 'SUCCESS') {
            return $this->propagateFailure($revokeResult, 'AuthServices::manageLogoutAllSessions');
        }

        $resArr = $this->initialResponse();
        $resArr['status'] = 'SUCCESS';
        $resArr['msgArr'][] = 'All user sessions have been revoked.';
        return $resArr;
    }

    private function getUserPermissions(array $actionData): array
    {
        $resArr = $this->initialResponse();
        $principal = $this->resolvePrincipal((string) ($actionData['_accessToken'] ?? ''));
        if ($principal['status'] !== 'SUCCESS') {
            return $principal;
        }
        $tenantId = filter_var($actionData['tenant_id'] ?? 0, FILTER_VALIDATE_INT);
        if ($tenantId === false || $tenantId < 0) {
            return $this->failed('tenant_id must be a non-negative integer.');
        }
        $result = $this->authDao->getUserPermissions(
            $this->connection,
            (int) $principal['data']['user_id'],
            (int) $tenantId,
        );
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'AuthServices::getUserPermissions');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'tenant_id' => (int) $tenantId > 0 ? (int) $tenantId : null,
            'permissions' => $result['data'],
        ];
        return $resArr;
    }

    private function manageUserProfile(array $actionData): array
    {
        $resArr = $this->initialResponse();
        $principal = $this->resolvePrincipal((string) ($actionData['_accessToken'] ?? ''));
        if ($principal['status'] !== 'SUCCESS') {
            return $principal;
        }
        $userId = (int) $principal['data']['user_id'];
        $fullName = trim((string) ($actionData['full_name'] ?? ''));
        $emailInput = strtolower(trim((string) ($actionData['email'] ?? '')));
        $mobileInput = trim((string) ($actionData['mobile'] ?? ''));
        $currentUser = $this->authDao->getUserById($this->connection, $userId);
        if ($currentUser['status'] !== 'SUCCESS' || $currentUser['data'] === []) {
            return $this->propagateFailure($currentUser, 'AuthServices::manageUserProfile');
        }
        $email = $emailInput !== '' ? $emailInput : (string) ($currentUser['data']['email'] ?? '');
        $mobile = $mobileInput !== '' ? $mobileInput : (string) ($currentUser['data']['mobile'] ?? '');
        if ($fullName === '' || strlen($fullName) > 150 || ($email === '' && $mobile === '')
            || strlen($email) > 190 || strlen($mobile) > 25
        ) {
            return $this->failed('A valid full_name and at least one of email or mobile are required.');
        }
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return $this->failed('A valid email address is required.');
        }
        if ($email !== '' && $email !== (string) ($currentUser['data']['email'] ?? '')) {
            $emailCheck = $this->authDao->isEmailAvailableForUser($this->connection, $email, $userId);
            if ($emailCheck['status'] !== 'SUCCESS') {
                return $this->propagateFailure($emailCheck, 'AuthServices::manageUserProfile');
            }
            if ($emailCheck['data'] !== []) {
                return $this->failed('The supplied email address is already in use.');
            }
        }
        if ($mobile !== '' && $mobile !== (string) ($currentUser['data']['mobile'] ?? '')) {
            $mobileCheck = $this->authDao->isMobileAvailableForUser($this->connection, $mobile, $userId);
            if ($mobileCheck['status'] !== 'SUCCESS') {
                return $this->propagateFailure($mobileCheck, 'AuthServices::manageUserProfile');
            }
            if ($mobileCheck['data'] !== []) {
                return $this->failed('The supplied mobile number is already in use.');
            }
        }
        try {
            $updated = $this->authDao->updateUserProfile(
                $this->connection, $userId, $fullName,
                $email !== '' ? $email : null,
                $mobile !== '' ? $mobile : null,
            );
            if ($updated['status'] !== 'SUCCESS') {
                return $this->propagateFailure($updated, 'AuthServices::manageUserProfile');
            }
            $profile = $this->authDao->getUserById($this->connection, $userId);
            if ($profile['status'] !== 'SUCCESS') {
                return $this->propagateFailure($profile, 'AuthServices::manageUserProfile');
            }
            $resArr['status'] = 'SUCCESS';
            $resArr['msgArr'][] = 'User profile updated successfully.';
            $resArr['data'] = $this->publicUser($profile['data']);
            return $resArr;
        } catch (Throwable $exception) {
            return $this->exception('manageUserProfile', $exception);
        }
    }

    private function getUserProfile(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->resolvePrincipal((string) ($actionData['_accessToken'] ?? ''));
        if ($principal['status'] !== 'SUCCESS') {
            return $principal;
        }

        $userResult = $this->authDao->getUserById($this->connection, (int) $principal['data']['user_id']);
        if ($userResult['status'] !== 'SUCCESS') {
            return $this->propagateFailure($userResult, 'AuthServices::getUserProfile');
        }
        if ($userResult['data'] === []) {
            return $this->failed('User account is unavailable.');
        }

        $resArr = $this->initialResponse();
        $resArr['status'] = 'SUCCESS';
        $resArr['msgArr'][] = 'User profile fetched successfully.';
        $resArr['data'] = $this->publicUser($userResult['data']);
        return $resArr;
    }

    private function resolvePrincipal(string $accessToken): array
    {
        $resArr = $this->initialResponse();
        if ($accessToken === '') {
            return $this->failed('Bearer access token is required.');
        }
        $claims = $this->tokenService->verifyAccessToken($accessToken);
        if ($claims === null) {
            return $this->failed('Access token is invalid or expired.');
        }

        $sessionResult = $this->authDao->getSessionByUuid($this->connection, $claims['sid']);
        if ($sessionResult['status'] !== 'SUCCESS') {
            return $this->propagateFailure($sessionResult, 'AuthServices::resolvePrincipal');
        }
        $session = $sessionResult['data'];
        if ($session === [] || !empty($session['revoked_on'])
            || $this->isUtcDateExpired((string) $session['expires_on'])
            || (int) $session['user_id'] !== (int) $claims['sub']
        ) {
            return $this->failed('Login session is no longer active.');
        }

        $userResult = $this->authDao->getUserById($this->connection, (int) $claims['sub']);
        if ($userResult['status'] !== 'SUCCESS') {
            return $this->propagateFailure($userResult, 'AuthServices::resolvePrincipal');
        }
        if ($userResult['data'] === [] || ($userResult['data']['account_status'] ?? '') !== 'ACTIVE') {
            return $this->failed('User account is inactive or unavailable.');
        }

        $resArr = $this->initialResponse();
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['user_id' => (int) $claims['sub'], 'session_uuid' => $claims['sid']];
        return $resArr;
    }

    private function validateEnvelope(array $authParam, string $method): ?array
    {
        if (!isset($authParam['actionType'])) {
            return $this->failed("Missing required key 'actionType' in {$method} input.");
        }
        if (!isset($authParam['actionData']) || !is_array($authParam['actionData'])) {
            return $this->failed("Missing or invalid 'actionData' in {$method} input.");
        }
        return null;
    }

    private function propagateFailure(array $downstream, string $context): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $downstream['msgArr'][] = $context . ' failed because a downstream operation did not return SUCCESS.';
        if ($downstream['status'] === 'SUCCESS') {
            $downstream['status'] = 'FAILED';
            $downstream['data'] = [];
        }
        return $downstream;
    }

    private function exception(string $operation, Throwable $exception): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $this->logger->error('AuthServices::' . $operation . ' failed.', ['exception' => $exception]);
        return [
            'status' => 'EXCEPTION',
            'msgArr' => ['Authentication operation failed unexpectedly.'],
            'data' => [],
        ];
    }

    private function failed(string $message): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return ['status' => 'FAILED', 'msgArr' => [$message], 'data' => []];
    }

    private function initialResponse(): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
    }

    private function publicUser(array $user): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return [
            'user_id' => (int) $user['id'],
            'full_name' => (string) ($user['full_name'] ?? ''),
            'email' => $user['email'] ?? null,
            'mobile' => $user['mobile'] ?? null,
            'profile_image' => $user['profile_image'] ?? null,
        ];
    }

    private function nullableString(mixed $value, int $maxLength): ?string
    {
        if (!is_scalar($value)) {
            return null;
        }
        $value = trim((string) $value);
        return $value === '' ? null : substr($value, 0, $maxLength);
    }

    private function uuid(): string
    {
        return bin2hex(random_bytes(16));
    }

    private function isUtcDateExpired(string $dateTime): bool
    {
        try {
            return (new DateTimeImmutable($dateTime, new DateTimeZone('UTC')))->getTimestamp() <= time();
        } catch (Throwable) {
            return true;
        }
    }

    private function utcNow(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');
    }

    private function utcDateTime(int $timestamp): string
    {
        return (new DateTimeImmutable('@' . $timestamp))
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d H:i:s');
    }
}
