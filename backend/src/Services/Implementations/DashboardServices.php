<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\DashboardDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\IDashboardServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class DashboardServices implements IDashboardServices
{
    public function __construct(
        private ConnectionInterface $db,
        private DashboardDao $dao,
        private TenantDao $tenantDao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getDashboard(array $dashboardParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($dashboardParam['actionType']) || !is_string($dashboardParam['actionType']) || $dashboardParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for getDashboard.';
            return $resArr;
        }
        if (!isset($dashboardParam['actionData']) || !is_array($dashboardParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $dashboardParam['actionData'];
        $actionData['action'] = (string) $dashboardParam['actionType'];
        try {
            switch ((string) $dashboardParam['actionType']) {
                case 'getConsumerDashboard':
                    $resArr = $this->getConsumerDashboard($actionData);
                    break;
                case 'getEntrepreneurDashboard':
                    $resArr = $this->getEntrepreneurDashboard($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported dashboard read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('DashboardServices::getDashboard failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Dashboard request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getConsumerDashboard(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'DashboardServices::getConsumerDashboard');
        }
        $result = $this->dao->getConsumerSummary($this->db, (int) $principal['data']['user_id']);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'DashboardServices::getConsumerDashboard');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function getEntrepreneurDashboard(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'DashboardServices::getEntrepreneurDashboard');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $permission = $this->tenantDao->hasTenantPermission(
            $this->db, (int) $principal['data']['user_id'], $tenantId, 'TENANT_MEMBERS_VIEW',
        );
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'DashboardServices::getEntrepreneurDashboard');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'Tenant dashboard permission is required.';
            return $resArr;
        }
        $result = $this->dao->getEntrepreneurSummary($this->db, $tenantId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'DashboardServices::getEntrepreneurDashboard');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['tenant_id' => $tenantId] + $result['data'];
        return $resArr;
    }

    private function principal(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $resArr = $this->authServices->getAuth([
            'actionType' => 'getPrincipal',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($resArr['status'] !== 'SUCCESS') {
            $resArr['msgArr'][] = 'DashboardServices could not resolve the authenticated user.';
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
