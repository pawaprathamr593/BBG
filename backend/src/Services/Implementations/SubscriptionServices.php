<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\SubscriptionDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\ISubscriptionServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class SubscriptionServices implements ISubscriptionServices
{
    public function __construct(
        private ConnectionInterface $db,
        private SubscriptionDao $dao,
        private TenantDao $tenantDao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getSubscription(array $subscriptionParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($subscriptionParam['actionType']) || $subscriptionParam['actionType'] !== 'getSubscription') {
            $resArr['msgArr'][] = 'Invalid actionType for getSubscription.';
            return $resArr;
        }
        if (!isset($subscriptionParam['actionData']) || !is_array($subscriptionParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $subscriptionParam['actionData'];
        try {
            switch ((string) ($actionData['action'] ?? '')) {
                case 'listActivePlans':
                    $resArr = $this->getActivePlans($actionData);
                    break;
                case 'listMySubscriptions':
                    $resArr = $this->getMySubscriptions($actionData);
                    break;
                case 'getMySubscription':
                    $resArr = $this->getMySubscription($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported subscription read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('SubscriptionServices::getSubscription failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Subscription request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function manageSubscription(array $subscriptionParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($subscriptionParam['actionType']) || $subscriptionParam['actionType'] !== 'manageSubscription') {
            $resArr['msgArr'][] = 'Invalid actionType for manageSubscription.';
            return $resArr;
        }
        if (!isset($subscriptionParam['actionData']) || !is_array($subscriptionParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $subscriptionParam['actionData'];
        try {
            switch ((string) ($actionData['action'] ?? '')) {
                case 'requestSubscription':
                    $resArr = $this->manageSubscriptionRequest($actionData, false);
                    break;
                case 'requestSubscriptionRenewal':
                    $resArr = $this->manageSubscriptionRequest($actionData, true);
                    break;
                case 'submitSubscriptionProof':
                    $resArr = $this->manageSubscriptionProof($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported subscription management action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('SubscriptionServices::manageSubscription failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Subscription management failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getActivePlans(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $result = $this->dao->getActivePlans($this->db);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'SubscriptionServices::getActivePlans');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $result['data']];
        return $resArr;
    }

    private function getMySubscriptions(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'SubscriptionServices::getMySubscriptions');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getTenantSubscriptions($this->db, $tenantId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'SubscriptionServices::getMySubscriptions');
        }
        $count = $this->dao->countTenantSubscriptions($this->db, $tenantId);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'SubscriptionServices::getMySubscriptions');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getMySubscription(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'SubscriptionServices::getMySubscription');
        }
        $subscriptionId = $this->positiveInt($actionData['subscription_id'] ?? null);
        if ($subscriptionId === null) {
            $resArr['msgArr'][] = 'A valid subscription_id is required.';
            return $resArr;
        }
        $result = $this->dao->getTenantSubscription($this->db, (int) $context['data']['tenant_id'], $subscriptionId);
        if ($result['status'] !== 'SUCCESS' || $result['data'] === []) {
            return $this->propagateFailure($result, 'SubscriptionServices::getMySubscription');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function manageSubscriptionRequest(array $actionData, bool $renewal): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'SubscriptionServices::manageSubscriptionRequest');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $userId = (int) $context['data']['user_id'];
        $planId = $this->positiveInt($actionData['plan_id'] ?? null);
        if ($renewal) {
            $subscriptionId = $this->positiveInt($actionData['subscription_id'] ?? null);
            if ($subscriptionId === null) {
                $resArr['msgArr'][] = 'subscription_id is required for a renewal request.';
                return $resArr;
            }
            $existingSubscription = $this->dao->getTenantSubscription($this->db, $tenantId, $subscriptionId);
            if ($existingSubscription['status'] !== 'SUCCESS' || $existingSubscription['data'] === []) {
                return $this->propagateFailure($existingSubscription, 'SubscriptionServices::manageSubscriptionRequest');
            }
            if (!in_array($existingSubscription['data']['subscription_status'], ['ACTIVE', 'EXPIRED'], true)) {
                $resArr['msgArr'][] = 'Only an active or expired subscription can be renewed.';
                return $resArr;
            }
            $planId = (int) $existingSubscription['data']['plan_id'];
        }
        if ($planId === null) {
            $resArr['msgArr'][] = 'A valid plan_id is required.';
            return $resArr;
        }
        $plan = $this->dao->getPlan($this->db, $planId);
        if ($plan['status'] !== 'SUCCESS' || $plan['data'] === []) {
            return $this->propagateFailure($plan, 'SubscriptionServices::manageSubscriptionRequest');
        }
        if (!$renewal) {
            $active = $this->dao->hasActiveSubscription($this->db, $tenantId);
            if ($active['status'] !== 'SUCCESS') {
                return $this->propagateFailure($active, 'SubscriptionServices::manageSubscriptionRequest');
            }
            if ($active['data'] !== []) {
                $resArr['msgArr'][] = 'An active subscription already exists. Use the renewal request for that subscription.';
                return $resArr;
            }
        }
        $pending = $this->dao->hasPendingSubscription($this->db, $tenantId);
        if ($pending['status'] !== 'SUCCESS') {
            return $this->propagateFailure($pending, 'SubscriptionServices::manageSubscriptionRequest');
        }
        if ($pending['data'] !== []) {
            $resArr['msgArr'][] = 'A subscription request is already pending for this tenant.';
            return $resArr;
        }
        return $this->dao->insertSubscription(
            $this->db, $tenantId, $planId, $userId,
            (string) $plan['data']['price'], (string) $plan['data']['currency'],
        );
    }

    private function manageSubscriptionProof(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'SubscriptionServices::manageSubscriptionProof');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $userId = (int) $context['data']['user_id'];
        $subscriptionId = $this->positiveInt($actionData['subscription_id'] ?? null);
        $proofPath = $this->requiredText($actionData['proof_file_path'] ?? '', 500);
        if ($subscriptionId === null || $proofPath === null
            || str_starts_with($proofPath, '/') || str_contains($proofPath, '..')
            || preg_match('/^[a-z]+:\/\//i', $proofPath)
        ) {
            $resArr['msgArr'][] = 'subscription_id and a safe server-issued relative proof_file_path are required.';
            return $resArr;
        }
        $subscription = $this->dao->getTenantSubscription($this->db, $tenantId, $subscriptionId);
        if ($subscription['status'] !== 'SUCCESS' || $subscription['data'] === []) {
            return $this->propagateFailure($subscription, 'SubscriptionServices::manageSubscriptionProof');
        }
        if (!in_array($subscription['data']['subscription_status'], ['PENDING', 'REJECTED'], true)) {
            $resArr['msgArr'][] = 'Payment proof can only be submitted for pending or rejected subscription requests.';
            return $resArr;
        }
        $pendingProof = $this->dao->hasPendingProof($this->db, $tenantId, $subscriptionId);
        if ($pendingProof['status'] !== 'SUCCESS') {
            return $this->propagateFailure($pendingProof, 'SubscriptionServices::manageSubscriptionProof');
        }
        if ($pendingProof['data'] !== []) {
            $resArr['msgArr'][] = 'A payment proof is already awaiting review.';
            return $resArr;
        }
        return $this->dao->insertSubscriptionProof(
            $this->db, $tenantId, $subscriptionId, $userId,
            $this->nullableText($actionData['payment_reference'] ?? null, 120), $proofPath,
        );
    }

    private function tenantContext(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->authServices->getAuth([
            'actionType' => 'getAuth',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'SubscriptionServices::tenantContext');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $permission = $this->tenantDao->hasTenantPermission(
            $this->db, (int) $principal['data']['user_id'], $tenantId, 'SUBSCRIPTIONS_MANAGE',
        );
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'SubscriptionServices::tenantContext');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'SUBSCRIPTIONS_MANAGE permission is required for this tenant.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['tenant_id' => $tenantId, 'user_id' => (int) $principal['data']['user_id']];
        return $resArr;
    }

    private function requiredText(mixed $value, int $maxLength): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return $text !== '' && strlen($text) <= $maxLength ? $text : null;
    }

    private function nullableText(mixed $value, int $maxLength): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return $text === '' ? null : (strlen($text) <= $maxLength ? $text : null);
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
