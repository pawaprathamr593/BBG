<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\ITenantServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class TenantServices implements ITenantServices
{
    public function __construct(
        private ConnectionInterface $db,
        private TenantDao $dao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getTenant(array $tenantParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($tenantParam['actionType'])) {
            $resArr['msgArr'][] = "Missing required key 'actionType'.";
            return $resArr;
        }
        if (!isset($tenantParam['actionData']) || !is_array($tenantParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        if (!is_string($tenantParam['actionType'] ?? null) || $tenantParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Unsupported actionType for getTenant.';
            return $resArr;
        }

        $actionData = $tenantParam['actionData'];
        $actionData['action'] = (string) $tenantParam['actionType'];
        try {
            switch ((string) $tenantParam['actionType']) {
                case 'listMyTenants':
                    $resArr = $this->getMyTenants($actionData);
                    break;
                case 'getMyTenant':
                    $resArr = $this->getMyTenant($actionData);
                    break;
                case 'listTenantMembers':
                    $resArr = $this->getTenantMembers($actionData);
                    break;
                case 'listOwnedTenantMembers':
                    $resArr = $this->getOwnedTenantMembers($actionData);
                    break;
                case 'searchEligibleTenantUsers':
                    $resArr = $this->searchEligibleTenantUsers($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported tenant read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('TenantServices::getTenant failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Tenant request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function manageTenant(array $tenantParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($tenantParam['actionType']) || !is_string($tenantParam['actionType']) || $tenantParam['actionType'] === ''
            || !isset($tenantParam['actionData']) || !is_array($tenantParam['actionData'])) {
            $resArr['msgArr'][] = 'Invalid tenant management request envelope.';
            return $resArr;
        }
        $actionData = $tenantParam['actionData'];
        $actionData['action'] = (string) $tenantParam['actionType'];
        try {
            switch ((string) $tenantParam['actionType']) {
                case 'addExistingTenantMember':
                    return $this->addExistingTenantMember($actionData);
                case 'removeTenantMember':
                    return $this->removeTenantMember($actionData);
                case 'changeTenantMemberRole':
                    return $this->changeTenantMemberRole($actionData);
                case 'createTenantInvitation':
                    return $this->createTenantInvitation($actionData);
                case 'acceptTenantInvitation':
                    return $this->acceptTenantInvitation($actionData);
                default:
                    $resArr['msgArr'][] = 'Unsupported tenant management action.';
                    return $resArr;
            }
        } catch (Throwable $exception) {
            $this->logger->error('TenantServices::manageTenant failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Tenant management failed unexpectedly.';
            return $resArr;
        }
    }

    private function getMyTenants(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->getPrincipal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'TenantServices::getMyTenants');
        }
        $userId = (int) $principal['data']['user_id'];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getMyTenants($this->db, $userId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'TenantServices::getMyTenants');
        }
        $count = $this->dao->countMyTenants($this->db, $userId);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'TenantServices::getMyTenants');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $rows['data'],
            'pagination' => ['page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0)],
        ];
        return $resArr;
    }

    private function getMyTenant(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->getPrincipal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'TenantServices::getMyTenant');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $result = $this->dao->getMyTenant($this->db, (int) $principal['data']['user_id'], $tenantId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'TenantServices::getMyTenant');
        }
        if ($result['data'] === []) {
            $resArr['msgArr'][] = 'Tenant membership was not found or is inactive.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function getTenantMembers(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->getPrincipal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'TenantServices::getTenantMembers');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $permission = $this->dao->hasTenantPermission(
            $this->db,
            (int) $principal['data']['user_id'],
            $tenantId,
            'tenant.view',
        );
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'TenantServices::getTenantMembers');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'tenant.view permission is required.';
            return $resArr;
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getTenantMembers($this->db, $tenantId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'TenantServices::getTenantMembers');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => ['page' => $page, 'page_size' => $pageSize]];
        return $resArr;
    }


    private function ownedTenantContext(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->getPrincipal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'TenantServices::ownedTenantContext');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $userId = (int) $principal['data']['user_id'];
        $owner = $this->dao->getOwnedTenant($this->db, $userId, $tenantId);
        if ($owner['status'] !== 'SUCCESS' || $owner['data'] === []) {
            $resArr['msgArr'][] = 'Only the active tenant owner can manage team membership and invitations.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['tenant_id' => $tenantId, 'user_id' => $userId];
        return $resArr;
    }

    private function getOwnedTenantMembers(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->ownedTenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'TenantServices::getOwnedTenantMembers');
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getTenantMembers($this->db, (int) $context['data']['tenant_id'], $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') return $this->propagateFailure($rows, 'TenantServices::getOwnedTenantMembers');
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => ['page' => $page, 'page_size' => $pageSize]];
        return $resArr;
    }

    private function searchEligibleTenantUsers(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->ownedTenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'TenantServices::searchEligibleTenantUsers');
        $emailQuery = strtolower(trim((string) ($actionData['email'] ?? '')));
        if (strlen($emailQuery) < 3 || strlen($emailQuery) > 190 || filter_var($emailQuery, FILTER_VALIDATE_EMAIL) === false) {
            $resArr['msgArr'][] = 'Enter a valid email address to search for an existing BBG user.';
            return $resArr;
        }
        $rows = $this->dao->searchEligibleTenantUsers($this->db, (int) $context['data']['tenant_id'], $emailQuery, 10);
        if ($rows['status'] !== 'SUCCESS') return $this->propagateFailure($rows, 'TenantServices::searchEligibleTenantUsers');
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data']];
        return $resArr;
    }

    private function addExistingTenantMember(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->ownedTenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'TenantServices::addExistingTenantMember');
        $userId = $this->positiveInt($actionData['user_id'] ?? null);
        $roleCode = strtoupper(trim((string) ($actionData['role_code'] ?? 'ORDER_MANAGER')));
        $allowedRoles = ['BUSINESS_MANAGER', 'SALES_MANAGER', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'FINANCE_MANAGER', 'STAFF'];
        if ($userId === null || !in_array($roleCode, $allowedRoles, true)) {
            $resArr['msgArr'][] = 'A valid user ID and eligible tenant role are required.';
            return $resArr;
        }
        $role = $this->dao->getAssignableTenantRole($this->db, $roleCode);
        if ($role['status'] !== 'SUCCESS' || $role['data'] === []) {
            $resArr['msgArr'][] = "The role '{$roleCode}' is not configured in this database.";
            return $resArr;
        }
        $transaction = $this->db->beginTransaction();
        try {
            $added = $this->dao->addTenantMember(
                $this->db, (int) $context['data']['tenant_id'], $userId,
                (int) $role['data']['id'], (int) $context['data']['user_id'],
            );
            if ($added['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($added, 'TenantServices::addExistingTenantMember');
            }
            $transaction->commit();
            $added['data']['role_code'] = $roleCode;
            return $added;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) $transaction->rollBack();
            throw $exception;
        }
    }

    private function removeTenantMember(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->ownedTenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'TenantServices::removeTenantMember');
        $userId = $this->positiveInt($actionData['user_id'] ?? null);
        if ($userId === null) {
            $resArr['msgArr'][] = 'A valid user_id is required.';
            return $resArr;
        }
        $transaction = $this->db->beginTransaction();
        try {
            $removed = $this->dao->removeTenantMember(
                $this->db, (int) $context['data']['tenant_id'], $userId, (int) $context['data']['user_id'],
            );
            if ($removed['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($removed, 'TenantServices::removeTenantMember');
            }
            $transaction->commit();
            return $removed;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) $transaction->rollBack();
            throw $exception;
        }
    }

    private function changeTenantMemberRole(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->ownedTenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'TenantServices::changeTenantMemberRole');
        $userId = $this->positiveInt($actionData['user_id'] ?? null);
        $roleCode = strtoupper(trim((string) ($actionData['role_code'] ?? '')));
        $allowedRoles = ['BUSINESS_MANAGER', 'SALES_MANAGER', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'FINANCE_MANAGER', 'STAFF'];
        if ($userId === null || !in_array($roleCode, $allowedRoles, true)) {
            $resArr['msgArr'][] = 'A valid user_id and eligible tenant role are required.';
            return $resArr;
        }
        $role = $this->dao->getAssignableTenantRole($this->db, $roleCode);
        if ($role['status'] !== 'SUCCESS' || $role['data'] === []) {
            $resArr['msgArr'][] = "The role '{$roleCode}' is not configured in this database.";
            return $resArr;
        }
        $transaction = $this->db->beginTransaction();
        try {
            $updated = $this->dao->updateTenantMemberRole(
                $this->db, (int) $context['data']['tenant_id'], $userId, (int) $role['data']['id'], (int) $context['data']['user_id'],
            );
            if ($updated['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($updated, 'TenantServices::changeTenantMemberRole');
            }
            $transaction->commit();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['tenant_id' => (int) $context['data']['tenant_id'], 'user_id' => $userId, 'role_code' => $roleCode];
            return $resArr;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) $transaction->rollBack();
            throw $exception;
        }
    }

    private function createTenantInvitation(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->ownedTenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') return $this->propagateFailure($context, 'TenantServices::createTenantInvitation');
        $email = strtolower(trim((string) ($actionData['email'] ?? '')));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false || strlen($email) > 190) {
            $resArr['msgArr'][] = 'A valid invitation email address is required.';
            return $resArr;
        }
        $existingUser = $this->dao->findActiveUserByEmail($this->db, $email);
        if ($existingUser['status'] !== 'SUCCESS') return $this->propagateFailure($existingUser, 'TenantServices::createTenantInvitation');
        if ($existingUser['data'] !== []) {
            $resArr['msgArr'][] = 'This email already belongs to an active BBG user. Search and add the existing user instead.';
            return $resArr;
        }
        $roleCode = strtoupper(trim((string) ($actionData['role_code'] ?? 'ORDER_MANAGER')));
        $allowedRoles = ['BUSINESS_MANAGER', 'SALES_MANAGER', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'FINANCE_MANAGER', 'STAFF'];
        if (!in_array($roleCode, $allowedRoles, true)) {
            $resArr['msgArr'][] = 'An eligible tenant role is required.';
            return $resArr;
        }
        $role = $this->dao->getAssignableTenantRole($this->db, $roleCode);
        if ($role['status'] !== 'SUCCESS' || $role['data'] === []) {
            $resArr['msgArr'][] = "The role '{$roleCode}' is not configured in this database.";
            return $resArr;
        }
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expiresOn = (new \DateTimeImmutable('+7 days'))->format('Y-m-d H:i:s');
        $transaction = $this->db->beginTransaction();
        try {
            $created = $this->dao->insertTenantInvitation(
                $this->db, (int) $context['data']['tenant_id'], $email, (int) $role['data']['id'],
                $tokenHash, $expiresOn, (int) $context['data']['user_id'],
            );
            if ($created['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($created, 'TenantServices::createTenantInvitation');
            }
            $transaction->commit();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = [
                'invitation_id' => (int) $created['data']['invitation_id'],
                'email' => $email, 'role_code' => $roleCode,
                'invitation_token' => $token, 'expires_on' => $expiresOn,
            ];
            return $resArr;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) $transaction->rollBack();
            throw $exception;
        }
    }

    private function acceptTenantInvitation(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->getPrincipal($actionData);
        if ($principal['status'] !== 'SUCCESS') return $this->propagateFailure($principal, 'TenantServices::acceptTenantInvitation');
        $token = strtolower(trim((string) ($actionData['invitation_token'] ?? '')));
        if (preg_match('/^[a-f0-9]{64}$/D', $token) !== 1) {
            $resArr['msgArr'][] = 'A valid invitation token is required.';
            return $resArr;
        }
        $userId = (int) $principal['data']['user_id'];
        $user = $this->dao->getActiveUserEmail($this->db, $userId);
        if ($user['status'] !== 'SUCCESS' || $user['data'] === []) return $this->propagateFailure($user, 'TenantServices::acceptTenantInvitation');
        $invitation = $this->dao->getTenantInvitationByTokenHash($this->db, hash('sha256', $token));
        if ($invitation['status'] !== 'SUCCESS' || $invitation['data'] === []) {
            $resArr['msgArr'][] = 'This invitation is invalid, expired or has already been used.';
            return $resArr;
        }
        if (strtolower((string) $invitation['data']['email']) !== strtolower((string) $user['data']['email'])) {
            $resArr['msgArr'][] = 'Sign in with the email address that received this invitation.';
            return $resArr;
        }
        if (($invitation['data']['role_code'] ?? '') !== 'TENANT_ORDER_MANAGER'
            || ($invitation['data']['tenant_status'] ?? '') !== 'ACTIVE') {
            $resArr['msgArr'][] = 'This invitation is no longer eligible for acceptance.';
            return $resArr;
        }
        $transaction = $this->db->beginTransaction();
        try {
            $added = $this->dao->addTenantMember(
                $this->db, (int) $invitation['data']['tenant_id'], $userId,
                (int) $invitation['data']['role_id'], $userId,
            );
            if ($added['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($added, 'TenantServices::acceptTenantInvitation');
            }
            $accepted = $this->dao->markTenantInvitationAccepted($this->db, (int) $invitation['data']['invitation_id'], $userId);
            if ($accepted['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($accepted, 'TenantServices::acceptTenantInvitation');
            }
            $transaction->commit();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['tenant_id' => (int) $invitation['data']['tenant_id'], 'membership_status' => 'ACTIVE'];
            return $resArr;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) $transaction->rollBack();
            throw $exception;
        }
    }

    private function getPrincipal(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $token = (string) ($actionData['_accessToken'] ?? '');
        $resArr = $this->authServices->getAuth([
            'actionType' => 'getPrincipal',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => $token],
        ]);
        if ($resArr['status'] !== 'SUCCESS') {
            $resArr['msgArr'][] = 'TenantServices could not resolve the authenticated user.';
        }
        return $resArr;
    }

    private function positiveInt(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $number = filter_var($value, FILTER_VALIDATE_INT);
        return $number !== false && $number > 0 ? (int) $number : null;
    }

    private function propagateFailure(array $downstream, string $context): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $downstream['msgArr'][] = $context . ' returned a non-success response.';
        if (($downstream['status'] ?? '') === 'SUCCESS') {
            $downstream['status'] = 'FAILED';
            $downstream['data'] = [];
        }
        return $downstream;
    }
}
