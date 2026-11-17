<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\AuthDao;
use App\Services\Interfaces\IAuthServices;
use App\Utils\AuthTokenService;
use App\Utils\SocialProviderTokenVerifier;
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
        private SocialProviderTokenVerifier $socialProviderTokenVerifier,
        private LoggerInterface $logger,
    ) {}

    public function getAuth(array $authParam): array
    {
        $resArr = $this->initialResponse();
        if (($validation = $this->validateEnvelope($authParam, 'getAuth')) !== null) {
            return $validation;
        }
        if (!is_string($authParam['actionType'] ?? null) || $authParam['actionType'] === '') {
            return $this->failed('Unsupported actionType for getAuth.');
        }

        $actionData = $authParam['actionData'];
        $actionData['action'] = (string) $authParam['actionType'];
        return match ($authParam['actionType']) {
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
        if (!is_string($authParam['actionType'] ?? null) || $authParam['actionType'] === '') {
            return $this->failed('Unsupported actionType for manageAuth.');
        }

        $actionData = $authParam['actionData'];
        return match ($authParam['actionType']) {
            'register' => $this->manageRegistration($actionData),
            'login' => $this->manageLogin($actionData),
            'socialLogin' => $this->manageSocialLogin($actionData),
            'socialLink' => $this->manageSocialLink($actionData),
            'refresh' => $this->manageRefreshSession($actionData),
            'logout' => $this->manageLogoutSession($actionData),
            'logoutAll' => $this->manageLogoutAllSessions($actionData),
            'updateProfile' => $this->manageUserProfile($actionData),
            'setPassword' => $this->manageUserPassword($actionData),
            default => $this->failed('Unsupported authentication management action.'),
        };
    }

    private function manageRegistration(array $actionData): array
    {
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

            $transaction = $this->connection->beginTransaction();
            try {
                $created = $this->authDao->insertUser(
                    $this->connection,
                    $fullName,
                    $email !== '' ? $email : null,
                    $mobile !== '' ? $mobile : null,
                    password_hash($password, PASSWORD_DEFAULT),
                );
                if ($created['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($created, 'AuthServices::manageRegistration');
                }

                $userId = (int) $created['data']['id'];
                $roleAssignment = $this->authDao->assignConsumerRole($this->connection, $userId);
                if ($roleAssignment['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($roleAssignment, 'AuthServices::manageRegistration');
                }

                $transaction->commit();
                $created['msgArr'][] = 'Account created successfully.';
                $created['data']['role_code'] = 'CONSUMER';
                $created['data']['role_scope'] = 'GLOBAL';
                return $created;
            } catch (Throwable $exception) {
                if ($transaction->isActive()) {
                    $transaction->rollBack();
                }
                throw $exception;
            }
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

    private function manageSocialLogin(array $actionData): array
    {
        $provider = strtoupper(trim((string) ($actionData['provider'] ?? '')));
        $intent = strtolower(trim((string) ($actionData['intent'] ?? 'login')));
        $credential = trim((string) ($actionData['credential'] ?? ''));
        if (!in_array($intent, ['login', 'register'], true)) {
            return $this->failed('Social authentication intent must be login or register.');
        }

        try {
            $this->tokenService->assertConfigured();
            $verified = $this->socialProviderTokenVerifier->verify($provider, $credential, [
                'nonce' => (string) ($actionData['nonce'] ?? ''),
                'full_name' => (string) ($actionData['full_name'] ?? ''),
                'redirect_uri' => (string) ($actionData['redirect_uri'] ?? ''),
            ]);
            if ($verified['full_name'] === '') {
                $verified['full_name'] = trim(substr((string) ($actionData['full_name'] ?? ''), 0, 150));
            }
            $identityResult = $this->authDao->getUserIdentity(
                $this->connection,
                $verified['provider'],
                $verified['subject'],
            );
            if ($identityResult['status'] !== 'SUCCESS') {
                return $this->propagateFailure($identityResult, 'AuthServices::manageSocialLogin');
            }

            $isNewUser = false;
            if ($identityResult['data'] !== []) {
                if (($identityResult['data']['status'] ?? '') !== 'A') {
                    return $this->failed('This provider identity is inactive. Contact BBG support for assistance.');
                }
                $userResult = $this->authDao->getUserById($this->connection, (int) $identityResult['data']['user_id']);
                if ($userResult['status'] !== 'SUCCESS' || $userResult['data'] === []) {
                    return $this->failed('The BBG account linked to this provider is unavailable.');
                }
                $user = $userResult['data'];
                if (($user['account_status'] ?? '') !== 'ACTIVE') {
                    return $this->failed('This BBG account is inactive.');
                }
            } else {
                if ($intent !== 'register') {
                    return $this->failed('No BBG account is linked to this provider. Choose create account to register.');
                }
                $email = $verified['email'] ?? strtolower(trim((string) ($actionData['email'] ?? '')));
                $mobile = trim((string) ($actionData['mobile'] ?? ''));
                if (($email === '' && $mobile === '') || strlen($email) > 190 || strlen($mobile) > 25) {
                    return $this->failed('Complete registration by providing an email address or mobile number.');
                }
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                    return $this->failed('Enter a valid email address to complete social registration.');
                }
                foreach (array_filter([$email, $mobile]) as $identifier) {
                    $contactCheck = $this->authDao->getUserByIdentifierForUniqueness($this->connection, $identifier);
                    if ($contactCheck['status'] !== 'SUCCESS') {
                        return $this->propagateFailure($contactCheck, 'AuthServices::manageSocialLogin');
                    }
                    if ($contactCheck['data'] !== []) {
                        return $this->failed('A BBG account already uses this email or mobile. Sign in to that existing BBG account instead of creating a duplicate.');
                    }
                }

                $fullName = trim($verified['full_name']);
                if ($fullName === '') {
                    $fullName = $email !== ''
                        ? (string) strstr($email, '@', true)
                        : ucfirst(strtolower($verified['provider'])) . ' member';
                }
                $transaction = $this->connection->beginTransaction();
                try {
                    $created = $this->authDao->insertSocialUser(
                        $this->connection,
                        substr($fullName, 0, 150),
                        $email !== '' ? $email : null,
                        $mobile !== '' ? $mobile : null,
                        $verified['profile_image'],
                        $verified['email_verified'] && $verified['email'] !== null,
                    );
                    if ($created['status'] !== 'SUCCESS') {
                        $transaction->rollBack();
                        return $this->propagateFailure($created, 'AuthServices::manageSocialLogin');
                    }
                    $userId = (int) $created['data']['id'];
                    $roleAssignment = $this->authDao->assignConsumerRole($this->connection, $userId);
                    if ($roleAssignment['status'] !== 'SUCCESS') {
                        $transaction->rollBack();
                        return $this->propagateFailure($roleAssignment, 'AuthServices::manageSocialLogin');
                    }
                    $linked = $this->authDao->insertUserIdentity(
                        $this->connection,
                        $userId,
                        $verified['provider'],
                        $verified['subject'],
                        $verified['email'],
                    );
                    if ($linked['status'] !== 'SUCCESS') {
                        $transaction->rollBack();
                        return $this->propagateFailure($linked, 'AuthServices::manageSocialLogin');
                    }
                    $transaction->commit();
                    $userResult = $this->authDao->getUserById($this->connection, $userId);
                    if ($userResult['status'] !== 'SUCCESS' || $userResult['data'] === []) {
                        return $this->failed('The new BBG account could not be loaded.');
                    }
                    $user = $userResult['data'];
                    $isNewUser = true;
                } catch (Throwable $exception) {
                    if ($transaction->isActive()) {
                        $transaction->rollBack();
                    }
                    throw $exception;
                }
            }

            $session = $this->createSession((int) $user['id'], $this->publicUser($user), true, $actionData);
            if (($session['status'] ?? '') === 'SUCCESS') {
                $session['data']['is_new_user'] = $isNewUser;
            }
            return $session;
        } catch (Throwable $exception) {
            return $this->exception('manageSocialLogin', $exception);
        }
    }

    private function manageSocialLink(array $actionData): array
    {
        $principal = $this->resolvePrincipal((string) ($actionData['_accessToken'] ?? ''));
        if ($principal['status'] !== 'SUCCESS') {
            return $principal;
        }
        try {
            $verified = $this->socialProviderTokenVerifier->verify(
                strtoupper(trim((string) ($actionData['provider'] ?? ''))),
                trim((string) ($actionData['credential'] ?? '')),
                [
                    'nonce' => (string) ($actionData['nonce'] ?? ''),
                    'full_name' => (string) ($actionData['full_name'] ?? ''),
                    'redirect_uri' => (string) ($actionData['redirect_uri'] ?? ''),
                ],
            );
            $userId = (int) $principal['data']['user_id'];
            $existingIdentity = $this->authDao->getUserIdentity(
                $this->connection,
                $verified['provider'],
                $verified['subject'],
            );
            if ($existingIdentity['status'] !== 'SUCCESS') {
                return $this->propagateFailure($existingIdentity, 'AuthServices::manageSocialLink');
            }
            if ($existingIdentity['data'] !== []) {
                if (($existingIdentity['data']['status'] ?? '') !== 'A') {
                    return $this->failed('This provider identity is inactive and cannot be linked again.');
                }
                if ((int) $existingIdentity['data']['user_id'] !== $userId) {
                    return $this->failed('This provider account is already linked to another BBG account.');
                }
                $resArr = $this->initialResponse();
                $resArr['status'] = 'SUCCESS';
                $resArr['msgArr'][] = 'This provider is already linked to your BBG account.';
                return $resArr;
            }
            if ($verified['email'] !== null) {
                $emailCheck = $this->authDao->getUserByIdentifierForUniqueness($this->connection, $verified['email']);
                if ($emailCheck['status'] !== 'SUCCESS') {
                    return $this->propagateFailure($emailCheck, 'AuthServices::manageSocialLink');
                }
                if ($emailCheck['data'] !== [] && (int) $emailCheck['data']['id'] !== $userId) {
                    return $this->failed('The provider email belongs to a different BBG account and cannot be linked.');
                }
            }
            $linked = $this->authDao->insertUserIdentity(
                $this->connection,
                $userId,
                $verified['provider'],
                $verified['subject'],
                $verified['email'],
            );
            if ($linked['status'] !== 'SUCCESS') {
                return $this->propagateFailure($linked, 'AuthServices::manageSocialLink');
            }
            $resArr = $this->initialResponse();
            $resArr['status'] = 'SUCCESS';
            $resArr['msgArr'][] = 'Provider linked to your BBG account successfully.';
            $resArr['data'] = ['provider' => $verified['provider']];
            return $resArr;
        } catch (Throwable $exception) {
            return $this->exception('manageSocialLink', $exception);
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

    private function manageUserPassword(array $actionData): array
    {
        $principal = $this->resolvePrincipal((string) ($actionData['_accessToken'] ?? ''));
        if ($principal['status'] !== 'SUCCESS') {
            return $principal;
        }

        $userId = (int) $principal['data']['user_id'];
        $currentUser = $this->authDao->getUserById($this->connection, $userId);
        if ($currentUser['status'] !== 'SUCCESS' || $currentUser['data'] === []) {
            return $this->propagateFailure($currentUser, 'AuthServices::manageUserPassword');
        }

        $existingHash = $currentUser['data']['password_hash'] ?? null;
        $hasPassword = is_string($existingHash) && $existingHash !== '';
        $currentPassword = (string) ($actionData['current_password'] ?? '');
        $newPassword = (string) ($actionData['new_password'] ?? '');

        if (strlen($newPassword) < 8 || strlen($newPassword) > 200) {
            return $this->failed('Your new password must contain at least 8 characters.');
        }
        if ($hasPassword && ($currentPassword === '' || !password_verify($currentPassword, $existingHash))) {
            return $this->failed('Your current password is incorrect.');
        }
        if (!$hasPassword && $currentPassword !== '') {
            return $this->failed('This account does not have an existing password. Set a new password without a current password.');
        }

        try {
            $updated = $this->authDao->updateUserPassword(
                $this->connection,
                $userId,
                password_hash($newPassword, PASSWORD_DEFAULT),
            );
            if ($updated['status'] !== 'SUCCESS') {
                return $this->propagateFailure($updated, 'AuthServices::manageUserPassword');
            }
            $resArr = $this->initialResponse();
            $resArr['status'] = 'SUCCESS';
            $resArr['msgArr'][] = $hasPassword ? 'Password changed successfully.' : 'Password set successfully.';
            $resArr['data'] = ['has_password' => true];
            return $resArr;
        } catch (Throwable $exception) {
            return $this->exception('manageUserPassword', $exception);
        }
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
        $resArr['msgArr'][] = $message;
        return $resArr;
    }

    private function initialResponse(): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $resArr;
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
            'has_password' => is_string($user['password_hash'] ?? null) && ($user['password_hash'] ?? '') !== '',
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
