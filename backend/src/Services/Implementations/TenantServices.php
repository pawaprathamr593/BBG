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
        $resArr['msgArr'][] = 'Tenant management actions are not part of the approved current API scope.';
        return $resArr;
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
