<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\CustomerDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\ICustomerServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class CustomerServices implements ICustomerServices
{
    public function __construct(
        private ConnectionInterface $db,
        private CustomerDao $dao,
        private TenantDao $tenantDao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getCustomer(array $customerParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($customerParam['actionType']) || !is_string($customerParam['actionType']) || $customerParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for getCustomer.';
            return $resArr;
        }
        if (!isset($customerParam['actionData']) || !is_array($customerParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $customerParam['actionData'];
        $actionData['action'] = (string) $customerParam['actionType'];
        try {
            switch ((string) $customerParam['actionType']) {
                case 'getMyCustomerProfile':
                    $resArr = $this->getMyCustomerProfile($actionData);
                    break;
                case 'listMyAddresses':
                    $resArr = $this->getMyAddresses($actionData);
                    break;
                case 'listTenantCustomers':
                    $resArr = $this->getTenantCustomers($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported customer read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('CustomerServices::getCustomer failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Customer request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function manageCustomer(array $customerParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($customerParam['actionType']) || !is_string($customerParam['actionType']) || $customerParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for manageCustomer.';
            return $resArr;
        }
        if (!isset($customerParam['actionData']) || !is_array($customerParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $customerParam['actionData'];
        $actionData['action'] = (string) $customerParam['actionType'];
        try {
            switch ((string) $customerParam['actionType']) {
                case 'createMyAddress':
                    $resArr = $this->manageMyAddress($actionData, 'create');
                    break;
                case 'updateMyAddress':
                    $resArr = $this->manageMyAddress($actionData, 'update');
                    break;
                case 'deleteMyAddress':
                    $resArr = $this->manageMyAddress($actionData, 'delete');
                    break;
                case 'setDefaultAddress':
                    $resArr = $this->manageMyAddress($actionData, 'default');
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported customer management action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('CustomerServices::manageCustomer failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Customer management failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getMyCustomerProfile(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $identity = $this->ensureCustomerIdentity($actionData);
        if ($identity['status'] !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'CustomerServices::getMyCustomerProfile');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $identity['data'];
        return $resArr;
    }

    private function getMyAddresses(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->personalAddressContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CustomerServices::getMyAddresses');
        }
        $rows = $this->dao->getAddresses($this->db, (int) $context['data']['user_id']);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'CustomerServices::getMyAddresses');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data']];
        return $resArr;
    }

    private function getTenantCustomers(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->authServices->getAuth([
            'actionType' => 'getProfile',
            'actionData' => ['action' => 'getProfile', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if (($principal['status'] ?? 'EXCEPTION') !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'CustomerServices::getTenantCustomers');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        $userId = (int) ($principal['data']['user_id'] ?? 0);
        if ($tenantId === null || $userId < 1) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $permission = $this->tenantDao->hasTenantPermission($this->db, $userId, $tenantId, 'customer.view');
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'CustomerServices::getTenantCustomers');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'You do not have customer.view permission is required to view this tenant customer directory.';
            return $resArr;
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(100, $this->positiveInt($actionData['page_size'] ?? 25) ?? 25);
        $rows = $this->dao->getTenantCustomers($this->db, $tenantId, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'CustomerServices::getTenantCustomers');
        }
        $count = $this->dao->countTenantCustomers($this->db, $tenantId);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'CustomerServices::getTenantCustomers');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function manageMyAddress(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->personalAddressContext($actionData);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'CustomerServices::manageMyAddress');
        }
        $userId = (int) $context['data']['user_id'];
        $addressId = $this->positiveInt($actionData['address_id'] ?? null);

        if ($operation !== 'create') {
            if ($addressId === null) {
                $resArr['msgArr'][] = 'A valid address_id is required.';
                return $resArr;
            }
            $existing = $this->dao->getAddress($this->db, $userId, $addressId);
            if ($existing['status'] !== 'SUCCESS' || $existing['data'] === []) {
                return $this->propagateFailure($existing, 'CustomerServices::manageMyAddress');
            }
        }

        if ($operation === 'delete') {
            return $this->dao->softDeleteAddress($this->db, $userId, $addressId, $userId);
        }
        if ($operation === 'default') {
            $transaction = $this->db->beginTransaction();
            try {
                $clear = $this->dao->clearDefaultAddresses($this->db, $userId, $userId);
                if ($clear['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($clear, 'CustomerServices::manageMyAddress');
                }
                $set = $this->dao->setDefaultAddress($this->db, $userId, $addressId, $userId);
                if ($set['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($set, 'CustomerServices::manageMyAddress');
                }
                $transaction->commit();
                return $set;
            } catch (Throwable $exception) {
                if ($transaction->isActive()) $transaction->rollBack();
                throw $exception;
            }
        }

        $line1 = $this->requiredText($actionData['address_line_1'] ?? '', 190);
        if ($line1 === null) {
            $resArr['msgArr'][] = 'address_line_1 is required.';
            return $resArr;
        }
        $isDefault = !empty($actionData['is_default']) ? 1 : 0;
        $label = $this->filterText($actionData['address_label'] ?? '', 50);
        $recipient = $this->filterText($actionData['recipient_name'] ?? '', 150);
        $mobile = $this->filterText($actionData['mobile'] ?? '', 25);
        $line2 = $this->filterText($actionData['address_line_2'] ?? '', 190);
        $city = $this->filterText($actionData['city'] ?? '', 100);
        $state = $this->filterText($actionData['state'] ?? '', 100);
        $postal = $this->filterText($actionData['postal_code'] ?? '', 15);
        $country = strtoupper($this->filterText($actionData['country_code'] ?? 'IN', 2));
        if (strlen($country) !== 2) {
            $resArr['msgArr'][] = 'country_code must contain two characters.';
            return $resArr;
        }

        $transaction = $this->db->beginTransaction();
        try {
            if ($isDefault === 1) {
                $clear = $this->dao->clearDefaultAddresses($this->db, $userId, $userId);
                if ($clear['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($clear, 'CustomerServices::manageMyAddress');
                }
            }
            if ($operation === 'create') {
                $result = $this->dao->insertAddress(
                    $this->db, $userId, $label, $recipient, $mobile,
                    $line1, $line2, $city, $state, $postal, $country, $isDefault,
                );
            } else {
                $result = $this->dao->updateAddress(
                    $this->db, $userId, $addressId, $userId, $label, $recipient, $mobile,
                    $line1, $line2, $city, $state, $postal, $country, $isDefault,
                );
            }
            if ($result['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($result, 'CustomerServices::manageMyAddress');
            }
            $transaction->commit();
            return $result;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) $transaction->rollBack();
            throw $exception;
        }
    }

    private function ensureCustomerIdentity(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $profile = $this->authServices->getAuth([
            'actionType' => 'getProfile',
            'actionData' => ['action' => 'getProfile', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($profile['status'] !== 'SUCCESS') {
            return $this->propagateFailure($profile, 'CustomerServices::ensureCustomerIdentity');
        }
        $userId = (int) ($profile['data']['user_id'] ?? 0);
        if ($userId < 1) {
            $resArr['msgArr'][] = 'Authenticated user profile is unavailable.';
            return $resArr;
        }
        $identity = $this->dao->getCustomerIdentity($this->db, $userId);
        if ($identity['status'] !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'CustomerServices::ensureCustomerIdentity');
        }
        if ($identity['data'] !== []) {
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = $identity['data'];
            return $resArr;
        }
        $created = $this->dao->insertCustomerIdentity(
            $this->db, $userId, (string) ($profile['data']['full_name'] ?? ''),
            $this->nullableText($profile['data']['email'] ?? null),
            $this->nullableText($profile['data']['mobile'] ?? null),
        );
        if ($created['status'] !== 'SUCCESS') {
            return $this->propagateFailure($created, 'CustomerServices::ensureCustomerIdentity');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'id' => (int) $created['data']['id'],
            'user_id' => $userId,
            'full_name' => $profile['data']['full_name'] ?? '',
            'email' => $profile['data']['email'] ?? null,
            'mobile' => $profile['data']['mobile'] ?? null,
        ];
        return $resArr;
    }

    /** Resolve the signed-in account for global My Account address operations.
     * Tenant context is intentionally not required: saved addresses belong to USERS.
     */
    private function personalAddressContext(array $actionData): array
    {
        $identity = $this->ensureCustomerIdentity($actionData);
        if (($identity['status'] ?? '') !== 'SUCCESS') {
            return $this->propagateFailure($identity, 'CustomerServices::personalAddressContext');
        }
        $userId = (int) ($identity['data']['user_id'] ?? 0);
        if ($userId < 1) {
            return ['status' => 'FAILED', 'msgArr' => ['Authenticated user profile is unavailable.'], 'data' => []];
        }
        return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => ['user_id' => $userId]];
    }

    private function customerContext(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $transaction = $this->db->beginTransaction();
        try {
            $identity = $this->ensureCustomerIdentity($actionData);
            if ($identity['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($identity, 'CustomerServices::customerContext');
            }
            $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
            if ($tenantId === null) {
                $transaction->rollBack();
                $resArr['msgArr'][] = 'A valid tenant_id is required.';
                return $resArr;
            }
            $tenant = $this->dao->getEligibleTenant($this->db, $tenantId);
            if ($tenant['status'] !== 'SUCCESS' || $tenant['data'] === []) {
                $transaction->rollBack();
                return $this->propagateFailure($tenant, 'CustomerServices::customerContext');
            }
            $userId = (int) $identity['data']['user_id'];
            $identityId = (int) $identity['data']['id'];
            $customer = $this->dao->getTenantCustomer($this->db, $tenantId, $identityId);
            if ($customer['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($customer, 'CustomerServices::customerContext');
            }
            if ($customer['data'] === []) {
                $created = $this->dao->insertTenantCustomer(
                    $this->db, $tenantId, $identityId, $userId,
                    (string) ($identity['data']['full_name'] ?? ''),
                    $this->nullableText($identity['data']['email'] ?? null),
                    $this->nullableText($identity['data']['mobile'] ?? null),
                );
                if ($created['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($created, 'CustomerServices::customerContext');
                }
                $customerId = (int) $created['data']['id'];
            } else {
                $customerId = (int) $customer['data']['id'];
            }
            $transaction->commit();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = [
                'user_id' => $userId, 'identity_id' => $identityId,
                'tenant_id' => $tenantId, 'tenant_customer_id' => $customerId,
            ];
            return $resArr;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            throw $exception;
        }
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
