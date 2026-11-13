<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\EnquiryDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\IEnquiryServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class EnquiryServices implements IEnquiryServices
{
    public function __construct(
        private ConnectionInterface $db,
        private EnquiryDao $dao,
        private TenantDao $tenantDao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getEnquiry(array $enquiryParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($enquiryParam['actionType']) || $enquiryParam['actionType'] !== 'getEnquiry') {
            $resArr['msgArr'][] = 'Invalid actionType for getEnquiry.';
            return $resArr;
        }
        if (!isset($enquiryParam['actionData']) || !is_array($enquiryParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $enquiryParam['actionData'];
        try {
            switch ((string) enquiryParam['actionType']) {
                case 'listMyEnquiries':
                    $resArr = $this->getMyEnquiries($actionData);
                    break;
                case 'getMyEnquiry':
                    $resArr = $this->getMyEnquiry($actionData);
                    break;
                case 'listTenantEnquiries':
                    $resArr = $this->getTenantEnquiries($actionData);
                    break;
                case 'getTenantEnquiry':
                    $resArr = $this->getTenantEnquiry($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported enquiry read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('EnquiryServices::getEnquiry failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Enquiry request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function manageEnquiry(array $enquiryParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($enquiryParam['actionType']) || $enquiryParam['actionType'] !== 'manageEnquiry') {
            $resArr['msgArr'][] = 'Invalid actionType for manageEnquiry.';
            return $resArr;
        }
        if (!isset($enquiryParam['actionData']) || !is_array($enquiryParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $enquiryParam['actionData'];
        try {
            switch ((string) enquiryParam['actionType']) {
                case 'createCustomerEnquiry':
                    $resArr = $this->manageCustomerEnquiry($actionData);
                    break;
                case 'respondToEnquiry':
                    $resArr = $this->manageTenantEnquiry($actionData, 'respond');
                    break;
                case 'closeEnquiry':
                    $resArr = $this->manageTenantEnquiry($actionData, 'close');
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported enquiry management action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('EnquiryServices::manageEnquiry failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Enquiry management failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getMyEnquiries(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $identity = $this->customerIdentity($actionData);
        if ($identity['status'] !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'EnquiryServices::getMyEnquiries');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getMyEnquiries($this->db, (int) $identity['data']['id'], $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'EnquiryServices::getMyEnquiries');
        }
        $count = $this->dao->countMyEnquiries($this->db, (int) $identity['data']['id']);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'EnquiryServices::getMyEnquiries');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getMyEnquiry(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $identity = $this->customerIdentity($actionData);
        if ($identity['status'] !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'EnquiryServices::getMyEnquiry');
        }
        $enquiryId = $this->positiveInt($actionData['enquiry_id'] ?? null);
        if ($enquiryId === null) {
            $resArr['msgArr'][] = 'A valid enquiry_id is required.';
            return $resArr;
        }
        $enquiry = $this->dao->getMyEnquiry($this->db, (int) $identity['data']['id'], $enquiryId);
        if ($enquiry['status'] !== 'SUCCESS' || $enquiry['data'] === []) {
            return $this->propagateFailure($enquiry, 'EnquiryServices::getMyEnquiry');
        }
        $messages = $this->dao->getMessages($this->db, (int) $enquiry['data']['tenant_id'], $enquiryId);
        if ($messages['status'] !== 'SUCCESS') {
            return $this->propagateFailure($messages, 'EnquiryServices::getMyEnquiry');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['enquiry' => $enquiry['data'], 'messages' => $messages['data']];
        return $resArr;
    }

    private function getTenantEnquiries(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'EnquiryServices::getTenantEnquiries');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getTenantEnquiries($this->db, $tenantId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'EnquiryServices::getTenantEnquiries');
        }
        $count = $this->dao->countTenantEnquiries($this->db, $tenantId);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'EnquiryServices::getTenantEnquiries');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getTenantEnquiry(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'EnquiryServices::getTenantEnquiry');
        }
        $enquiryId = $this->positiveInt($actionData['enquiry_id'] ?? null);
        if ($enquiryId === null) {
            $resArr['msgArr'][] = 'A valid enquiry_id is required.';
            return $resArr;
        }
        $enquiry = $this->dao->getTenantEnquiry($this->db, (int) $context['data']['tenant_id'], $enquiryId);
        if ($enquiry['status'] !== 'SUCCESS' || $enquiry['data'] === []) {
            return $this->propagateFailure($enquiry, 'EnquiryServices::getTenantEnquiry');
        }
        $messages = $this->dao->getMessages($this->db, (int) $context['data']['tenant_id'], $enquiryId);
        if ($messages['status'] !== 'SUCCESS') {
            return $this->propagateFailure($messages, 'EnquiryServices::getTenantEnquiry');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['enquiry' => $enquiry['data'], 'messages' => $messages['data']];
        return $resArr;
    }

    private function manageCustomerEnquiry(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'EnquiryServices::manageCustomerEnquiry');
        }
        $profile = $this->authServices->getAuth([
            'actionType' => 'getAuth',
            'actionData' => ['action' => 'getProfile', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($profile['status'] !== 'SUCCESS') {
            return $this->propagateFailure($profile, 'EnquiryServices::manageCustomerEnquiry');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        $message = $this->requiredText($actionData['message'] ?? '', 5000);
        if ($tenantId === null || $message === null) {
            $resArr['msgArr'][] = 'tenant_id and a non-empty message are required.';
            return $resArr;
        }
        $tenant = $this->dao->getEligibleTenant($this->db, $tenantId);
        if ($tenant['status'] !== 'SUCCESS' || $tenant['data'] === []) {
            return $this->propagateFailure($tenant, 'EnquiryServices::manageCustomerEnquiry');
        }
        $userId = (int) $principal['data']['user_id'];
        $identity = $this->dao->getCustomerIdentity($this->db, $userId);
        if ($identity['status'] !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'EnquiryServices::manageCustomerEnquiry');
        }
        if ($identity['data'] === []) {
            $identity = $this->dao->insertCustomerIdentity(
                $this->db, $userId, (string) ($profile['data']['full_name'] ?? ''),
                $this->nullableText($profile['data']['email'] ?? null),
                $this->nullableText($profile['data']['mobile'] ?? null),
            );
            if ($identity['status'] !== 'SUCCESS') {
                return $this->propagateFailure($identity, 'EnquiryServices::manageCustomerEnquiry');
            }
            $identityId = (int) $identity['data']['id'];
        } else {
            $identityId = (int) $identity['data']['id'];
        }
        $subject = $this->filterText($actionData['subject'] ?? '', 180);
        $number = 'ENQ-' . gmdate('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $transaction = $this->db->beginTransaction();
        try {
            $created = $this->dao->insertEnquiry($this->db, $tenantId, $identityId, $number, $subject, $message, $userId);
            if ($created['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($created, 'EnquiryServices::manageCustomerEnquiry');
            }
            $enquiryId = (int) $created['data']['id'];
            $messageResult = $this->dao->insertMessage($this->db, $tenantId, $enquiryId, $userId, 'CUSTOMER', $message);
            if ($messageResult['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($messageResult, 'EnquiryServices::manageCustomerEnquiry');
            }
            $transaction->commit();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['id' => $enquiryId, 'enquiry_number' => $number, 'enquiry_status' => 'PENDING'];
            return $resArr;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            throw $exception;
        }
    }

    private function manageTenantEnquiry(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->tenantContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'EnquiryServices::manageTenantEnquiry');
        }
        $tenantId = (int) $context['data']['tenant_id'];
        $userId = (int) $context['data']['user_id'];
        $enquiryId = $this->positiveInt($actionData['enquiry_id'] ?? null);
        if ($enquiryId === null) {
            $resArr['msgArr'][] = 'A valid enquiry_id is required.';
            return $resArr;
        }
        $enquiry = $this->dao->getTenantEnquiry($this->db, $tenantId, $enquiryId);
        if ($enquiry['status'] !== 'SUCCESS' || $enquiry['data'] === []) {
            return $this->propagateFailure($enquiry, 'EnquiryServices::manageTenantEnquiry');
        }
        $oldStatus = (string) $enquiry['data']['enquiry_status'];
        if ($oldStatus === 'CLOSED') {
            $resArr['msgArr'][] = 'Closed enquiries cannot be changed.';
            return $resArr;
        }
        $transaction = $this->db->beginTransaction();
        try {
            if ($operation === 'respond') {
                $message = $this->requiredText($actionData['message'] ?? '', 5000);
                if ($message === null) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'A non-empty response message is required.';
                    return $resArr;
                }
                $messageResult = $this->dao->insertMessage($this->db, $tenantId, $enquiryId, $userId, 'TENANT', $message);
                if ($messageResult['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($messageResult, 'EnquiryServices::manageTenantEnquiry');
                }
                $updated = $this->dao->updateEnquiryStatus($this->db, $tenantId, $enquiryId, $userId, $oldStatus, 'RESPONDED');
            } else {
                $updated = $this->dao->updateEnquiryStatus($this->db, $tenantId, $enquiryId, $userId, $oldStatus, 'CLOSED');
            }
            if ($updated['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($updated, 'EnquiryServices::manageTenantEnquiry');
            }
            $transaction->commit();
            return $updated;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            throw $exception;
        }
    }

    private function customerIdentity(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'EnquiryServices::customerIdentity');
        }
        $identity = $this->dao->getCustomerIdentity($this->db, (int) $principal['data']['user_id']);
        if ($identity['status'] !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'EnquiryServices::customerIdentity');
        }
        if ($identity['data'] === []) {
            $profile = $this->authServices->getAuth([
                'actionType' => 'getAuth',
                'actionData' => ['action' => 'getProfile', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
            ]);
            if ($profile['status'] !== 'SUCCESS') {
                return $this->propagateFailure($profile, 'EnquiryServices::customerIdentity');
            }
            $identity = $this->dao->insertCustomerIdentity(
                $this->db, (int) $principal['data']['user_id'], (string) ($profile['data']['full_name'] ?? ''),
                $this->nullableText($profile['data']['email'] ?? null), $this->nullableText($profile['data']['mobile'] ?? null),
            );
            if ($identity['status'] !== 'SUCCESS') {
                return $this->propagateFailure($identity, 'EnquiryServices::customerIdentity');
            }
            $identity['data'] = ['id' => (int) $identity['data']['id']];
        }
        return $identity;
    }

    private function principal(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $resArr = $this->authServices->getAuth([
            'actionType' => 'getAuth',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($resArr['status'] !== 'SUCCESS') {
            $resArr['msgArr'][] = 'EnquiryServices could not resolve the authenticated user.';
        }
        return $resArr;
    }

    private function tenantContext(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'EnquiryServices::tenantContext');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $permission = $this->tenantDao->hasTenantPermission(
            $this->db, (int) $principal['data']['user_id'], $tenantId, 'ENQUIRIES_MANAGE',
        );
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'EnquiryServices::tenantContext');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'ENQUIRIES_MANAGE permission is required for this tenant.';
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

    private function filterText(mixed $value, int $maxLength): string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return '';
        }
        return substr(trim((string) $value), 0, $maxLength);
    }

    private function nullableText(mixed $value): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return $text === '' ? null : $text;
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
