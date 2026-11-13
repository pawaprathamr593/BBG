<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\PaymentDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\IPaymentServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class PaymentServices implements IPaymentServices
{
    public function __construct(
        private ConnectionInterface $db,
        private PaymentDao $dao,
        private TenantDao $tenantDao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getPayment(array $paymentParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($paymentParam['actionType']) || !is_string($paymentParam['actionType']) || $paymentParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for getPayment.';
            return $resArr;
        }
        if (!isset($paymentParam['actionData']) || !is_array($paymentParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $paymentParam['actionData'];
        $actionData['action'] = (string) $paymentParam['actionType'];
        try {
            switch ((string) $paymentParam['actionType']) {
                case 'listMyPayments':
                    $resArr = $this->getMyPayments($actionData);
                    break;
                case 'getMyPayment':
                    $resArr = $this->getMyPayment($actionData);
                    break;
                case 'listTenantPayments':
                    $resArr = $this->getTenantPayments($actionData);
                    break;
                case 'getTenantPayment':
                    $resArr = $this->getTenantPayment($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported payment read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('PaymentServices::getPayment failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Payment request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getMyPayments(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $identity = $this->customerIdentity($actionData);
        if ($identity['status'] !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'PaymentServices::getMyPayments');
        }
        if ($identity['data'] === []) {
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['items' => [], 'pagination' => ['page' => 1, 'page_size' => 20, 'total' => 0]];
            return $resArr;
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getMyPayments($this->db, (int) $identity['data']['id'], $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'PaymentServices::getMyPayments');
        }
        $count = $this->dao->countMyPayments($this->db, (int) $identity['data']['id']);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'PaymentServices::getMyPayments');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getMyPayment(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $identity = $this->customerIdentity($actionData);
        if ($identity['status'] !== 'SUCCESS' || $identity['data'] === []) {
            return $this->propagateFailure($identity, 'PaymentServices::getMyPayment');
        }
        $paymentId = $this->positiveInt($actionData['payment_id'] ?? null);
        if ($paymentId === null) {
            $resArr['msgArr'][] = 'A valid payment_id is required.';
            return $resArr;
        }
        $payment = $this->dao->getMyPayment($this->db, (int) $identity['data']['id'], $paymentId);
        if ($payment['status'] !== 'SUCCESS' || $payment['data'] === []) {
            return $this->propagateFailure($payment, 'PaymentServices::getMyPayment');
        }
        return $this->paymentDetail($payment['data']);
    }

    private function getTenantPayments(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'PaymentServices::getTenantPayments');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getTenantPayments($this->db, $tenantId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'PaymentServices::getTenantPayments');
        }
        $count = $this->dao->countTenantPayments($this->db, $tenantId);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'PaymentServices::getTenantPayments');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getTenantPayment(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'PaymentServices::getTenantPayment');
        }
        $paymentId = $this->positiveInt($actionData['payment_id'] ?? null);
        if ($paymentId === null) {
            $resArr['msgArr'][] = 'A valid payment_id is required.';
            return $resArr;
        }
        $payment = $this->dao->getTenantPayment($this->db, (int) $context['data']['tenant_id'], $paymentId);
        if ($payment['status'] !== 'SUCCESS' || $payment['data'] === []) {
            return $this->propagateFailure($payment, 'PaymentServices::getTenantPayment');
        }
        return $this->paymentDetail($payment['data']);
    }

    private function paymentDetail(array $payment): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $tenantId = (int) $payment['tenant_id'];
        $paymentId = (int) $payment['id'];
        $transactions = $this->dao->getPaymentTransactions($this->db, $tenantId, $paymentId);
        if ($transactions['status'] !== 'SUCCESS') {
            return $this->propagateFailure($transactions, 'PaymentServices::paymentDetail');
        }
        $refunds = $this->dao->getPaymentRefunds($this->db, $tenantId, $paymentId);
        if ($refunds['status'] !== 'SUCCESS') {
            return $this->propagateFailure($refunds, 'PaymentServices::paymentDetail');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['payment' => $payment, 'transactions' => $transactions['data'], 'refunds' => $refunds['data']];
        return $resArr;
    }

    private function customerIdentity(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->authServices->getAuth([
            'actionType' => 'getPrincipal',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'PaymentServices::customerIdentity');
        }
        $identity = $this->dao->getCustomerIdentity($this->db, (int) $principal['data']['user_id']);
        if ($identity['status'] !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'PaymentServices::customerIdentity');
        }
        return $identity;
    }

    private function tenantContext(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->authServices->getAuth([
            'actionType' => 'getPrincipal',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'PaymentServices::tenantContext');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $permission = $this->tenantDao->hasTenantPermission(
            $this->db, (int) $principal['data']['user_id'], $tenantId, 'PAYMENTS_VIEW',
        );
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'PaymentServices::tenantContext');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'PAYMENTS_VIEW permission is required for this tenant.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['tenant_id' => $tenantId, 'user_id' => (int) $principal['data']['user_id']];
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
