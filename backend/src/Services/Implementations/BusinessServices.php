<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\BusinessDao;
use App\Dao\TenantDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\IBusinessServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class BusinessServices implements IBusinessServices
{
    public function __construct(
        private ConnectionInterface $db,
        private BusinessDao $dao,
        private TenantDao $tenantDao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getBusiness(array $businessParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($businessParam['actionType'])) {
            $resArr['msgArr'][] = "Missing required key 'actionType'.";
            return $resArr;
        }
        if (!isset($businessParam['actionData']) || !is_array($businessParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        if (!is_string($businessParam['actionType'] ?? null) || $businessParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Unsupported actionType for getBusiness.';
            return $resArr;
        }
        $actionData = $businessParam['actionData'];
        $actionData['action'] = (string) $businessParam['actionType'];
        try {
            switch ((string) $businessParam['actionType']) {
                case 'getMyBusinessApplication':
                    $resArr = $this->getBusinessApplication($actionData);
                    break;
                case 'getMyBusinessProfile':
                    $resArr = $this->getBusinessProfile($actionData);
                    break;
                case 'getBusinessVerification':
                    $resArr = $this->getBusinessVerification($actionData);
                    break;
                case 'getMyStorefront':
                    $resArr = $this->getMyStorefront($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported business read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('BusinessServices::getBusiness failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Business request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function manageBusiness(array $businessParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($businessParam['actionType'])) {
            $resArr['msgArr'][] = "Missing required key 'actionType'.";
            return $resArr;
        }
        if (!isset($businessParam['actionData']) || !is_array($businessParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        if (!is_string($businessParam['actionType'] ?? null) || $businessParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Unsupported actionType for manageBusiness.';
            return $resArr;
        }
        $actionData = $businessParam['actionData'];
        $actionData['action'] = (string) $businessParam['actionType'];
        try {
            switch ((string) $businessParam['actionType']) {
                case 'submitBusinessApplication':
                    $resArr = $this->manageBusinessApplication($actionData, 'submit');
                    break;
                case 'updateBusinessApplication':
                    $resArr = $this->manageBusinessApplication($actionData, 'update');
                    break;
                case 'resubmitBusinessApplication':
                    $resArr = $this->manageBusinessApplication($actionData, 'resubmit');
                    break;
                case 'updateMyBusinessProfile':
                    $resArr = $this->manageBusinessProfile($actionData);
                    break;
                case 'updateMyStorefront':
                    $resArr = $this->manageMyStorefront($actionData, 'update');
                    break;
                case 'publishMyStorefront':
                    $resArr = $this->manageMyStorefront($actionData, 'publish');
                    break;
                case 'unpublishMyStorefront':
                    $resArr = $this->manageMyStorefront($actionData, 'unpublish');
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported business management action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('BusinessServices::manageBusiness failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Business management failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getBusinessApplication(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'BusinessServices::getBusinessApplication');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? 0) ?? 0;
        if ($tenantId > 0) {
            $access = $this->requireTenantPermission((int) $principal['data']['user_id'], $tenantId, 'business.view', 'BusinessServices::getBusinessApplication');
            if ($access['status'] !== 'SUCCESS') return $access;
        }
        $result = $this->dao->getMyBusinessApplication($this->db, (int) $principal['data']['user_id'], $tenantId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'BusinessServices::getBusinessApplication');
        }
        if ($result['data'] === []) {
            $resArr['msgArr'][] = 'No business application is associated with the authenticated user.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function getBusinessProfile(array $actionData): array
    {
        $resArr = $this->getBusinessApplication($actionData);
        if ($resArr['status'] !== 'SUCCESS') {
            return $resArr;
        }
        $entitlement = $this->requireTenantEntitlement((int) $resArr['data']['tenant_id'], 'business.profile', 'BusinessServices::getBusinessProfile');
        if ($entitlement['status'] !== 'SUCCESS') return $entitlement;
        if (($resArr['data']['approval_status'] ?? '') !== 'APPROVED') {
            $resArr['status'] = 'FAILED';
            $resArr['msgArr'][] = 'Business profile is not approved.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getBusinessVerification(array $actionData): array
    {
        $resArr = $this->getBusinessApplication($actionData);
        if ($resArr['status'] === 'SUCCESS') {
            $resArr['data'] = [
                'tenant_id' => $resArr['data']['tenant_id'],
                'tenant_status' => $resArr['data']['tenant_status'],
                'approval_status' => $resArr['data']['approval_status'],
                'approved_on' => $resArr['data']['approved_on'],
                'rejection_reason' => $resArr['data']['rejection_reason'],
                'publication_status' => $resArr['data']['publication_status'],
            ];
        }
        return $resArr;
    }

    private function manageBusinessApplication(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'BusinessServices::manageBusinessApplication');
        }
        $userId = (int) $principal['data']['user_id'];
        $businessName = $this->requiredText($actionData['business_name'] ?? '', 180);
        $businessSlugInput = $this->requiredText($actionData['business_slug'] ?? '', 200);
        $tenantTypeInput = $this->requiredText($actionData['tenant_type'] ?? '', 40);
        if ($businessName === null || $businessSlugInput === null || $tenantTypeInput === null) {
            $resArr['msgArr'][] = 'Business name, slug and tenant type are required.';
            return $resArr;
        }
        $businessSlug = strtolower($businessSlugInput);
        $tenantType = strtoupper($tenantTypeInput);
        if ($businessSlug === '' || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $businessSlug)) {
            $resArr['msgArr'][] = 'A URL-safe business_slug is required.';
            return $resArr;
        }

        $businessId = $this->positiveInt($actionData['business_id'] ?? 0) ?? 0;
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? 0) ?? 0;
        $resubmit = $operation === 'resubmit';
        if ($operation !== 'submit' && ($businessId === 0 || $tenantId === 0)) {
            $resArr['msgArr'][] = 'business_id and tenant_id are required to update or resubmit an application.';
            return $resArr;
        }
        if ($operation !== 'submit') {
            $access = $this->requireTenantPermission($userId, $tenantId, 'business.update', 'BusinessServices::manageBusinessApplication');
            if ($access['status'] !== 'SUCCESS') return $access;
        }
        // Initial business application submission is an authenticated onboarding flow.
        if ($operation === 'submit' && ($businessId > 0 || $tenantId > 0)) {
            $resArr['msgArr'][] = 'A new application must not include business_id or tenant_id.';
            return $resArr;
        }
        $categoryId = $this->positiveInt($actionData['primary_category_id'] ?? 0);
        $description = $this->optionalText($actionData['business_description'] ?? '', 5000);
        $phone = $this->optionalText($actionData['business_phone'] ?? '', 25) ?? '';
        $whatsapp = $this->optionalText($actionData['whatsapp_number'] ?? '', 25) ?? '';
        $email = $this->optionalText($actionData['business_email'] ?? '', 190) ?? '';
        $address1 = $this->optionalText($actionData['address_line_1'] ?? '', 190) ?? '';
        $address2 = $this->optionalText($actionData['address_line_2'] ?? '', 190) ?? '';
        $city = $this->optionalText($actionData['city'] ?? '', 100) ?? '';
        $state = $this->optionalText($actionData['state'] ?? '', 100) ?? '';
        $postal = $this->optionalText($actionData['postal_code'] ?? '', 15) ?? '';
        $country = strtoupper($this->optionalText($actionData['country_code'] ?? 'IN', 2) ?? 'IN');
        $latitude = isset($actionData['latitude']) && is_numeric($actionData['latitude']) ? (float) $actionData['latitude'] : null;
        $longitude = isset($actionData['longitude']) && is_numeric($actionData['longitude']) ? (float) $actionData['longitude'] : null;
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $resArr['msgArr'][] = 'A valid business_email is required.';
            return $resArr;
        }
        if (($latitude !== null && ($latitude < -90 || $latitude > 90))
            || ($longitude !== null && ($longitude < -180 || $longitude > 180))
        ) {
            $resArr['msgArr'][] = 'Latitude or longitude is outside the valid coordinate range.';
            return $resArr;
        }
        if ($country === '' || strlen($country) !== 2) {
            $resArr['msgArr'][] = 'country_code must contain two characters.';
            return $resArr;
        }

        try {
            $slugResult = $this->dao->isBusinessSlugAvailable($this->db, $businessSlug, $businessId);
            if ($slugResult['status'] !== 'SUCCESS') {
                return $this->propagateFailure($slugResult, 'BusinessServices::manageBusinessApplication');
            }
            if ($slugResult['data'] !== []) {
                $resArr['msgArr'][] = 'business_slug is already in use.';
                return $resArr;
            }

            if ($operation !== 'submit') {
                $existing = $this->dao->getMyBusinessApplication($this->db, $userId, $tenantId);
                if ($existing['status'] !== 'SUCCESS') {
                    return $this->propagateFailure($existing, 'BusinessServices::manageBusinessApplication');
                }
                $allowedStatus = $operation === 'resubmit' ? ['REJECTED'] : ['PENDING'];
                if ($existing['data'] === [] || (int) $existing['data']['business_id'] !== $businessId
                    || !in_array($existing['data']['approval_status'], $allowedStatus, true)
                ) {
                    $resArr['msgArr'][] = 'Only the authenticated tenant owner can update a pending or rejected application.';
                    return $resArr;
                }
                $transaction = $this->db->beginTransaction();
                try {
                    $update = $this->dao->updateBusinessApplication(
                        $this->db, $tenantId, $businessId, $userId, $businessName, $businessSlug,
                        $description ?? '', $categoryId, $phone, $whatsapp, $email, $address1, $address2,
                        $city, $state, $postal, $country, $latitude, $longitude, $resubmit,
                    );
                    if ($update['status'] !== 'SUCCESS') {
                        $transaction->rollBack();
                        return $this->propagateFailure($update, 'BusinessServices::manageBusinessApplication');
                    }
                    $transaction->commit();
                    $resArr['status'] = 'SUCCESS';
                    $resArr['data'] = ['business_id' => $businessId, 'tenant_id' => $tenantId];
                    return $resArr;
                } catch (Throwable $exception) {
                    if ($transaction->isActive()) {
                        $transaction->rollBack();
                    }
                    throw $exception;
                }
            }

            $existingApplication = $this->dao->getMyBusinessApplication($this->db, $userId, 0);
            if ($existingApplication['status'] !== 'SUCCESS') {
                return $this->propagateFailure($existingApplication, 'BusinessServices::manageBusinessApplication');
            }
            if ($existingApplication['data'] !== []) {
                $resArr['msgArr'][] = 'An application already exists for this user. Update or resubmit the existing application.';
                return $resArr;
            }

            $transaction = $this->db->beginTransaction();
            try {
                $tenantCode = 'TEN-' . strtoupper(bin2hex(random_bytes(8)));
                $tenant = $this->dao->insertTenant($this->db, $tenantCode, $businessName, $tenantType, $userId);
                if ($tenant['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($tenant, 'BusinessServices::manageBusinessApplication');
                }
                $newTenantId = (int) $tenant['data']['id'];
                $membership = $this->dao->insertMembership($this->db, $newTenantId, $userId);
                if ($membership['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($membership, 'BusinessServices::manageBusinessApplication');
                }
                $role = $this->dao->ensureTenantOwnerRole($this->db);
                if ($role['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($role, 'BusinessServices::manageBusinessApplication');
                }
                $assignment = $this->dao->insertOwnerAssignment($this->db, $newTenantId, $userId, (int) $role['data']['id']);
                if ($assignment['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($assignment, 'BusinessServices::manageBusinessApplication');
                }
                $profile = $this->dao->insertBusinessProfile(
                    $this->db, $newTenantId, $businessName, $businessSlug, $description ?? '', $categoryId,
                    $phone, $whatsapp, $email, $address1, $address2, $city, $state, $postal, $country, $latitude, $longitude, $userId,
                );
                if ($profile['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($profile, 'BusinessServices::manageBusinessApplication');
                }
                $storefront = $this->dao->insertStorefrontSettings($this->db, $newTenantId, $userId);
                if ($storefront['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($storefront, 'BusinessServices::manageBusinessApplication');
                }
                $transaction->commit();
                $resArr['status'] = 'SUCCESS';
                $resArr['data'] = ['business_id' => (int) $profile['data']['id'], 'tenant_id' => $newTenantId, 'approval_status' => 'PENDING'];
                return $resArr;
            } catch (Throwable $exception) {
                if ($transaction->isActive()) {
                    $transaction->rollBack();
                }
                throw $exception;
            }
        } catch (Throwable $exception) {
            $this->logger->error('BusinessServices::manageBusinessApplication failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Business application could not be saved.';
            $resArr['data'] = [];
            return $resArr;
        }
    }

    private function getMyStorefront(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'BusinessServices::getMyStorefront');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $access = $this->requireTenantPermission((int) $principal['data']['user_id'], $tenantId, 'business.view', 'BusinessServices::getMyStorefront');
        if ($access['status'] !== 'SUCCESS') return $access;
        $entitlement = $this->requireTenantEntitlement($tenantId, 'storefront.enabled', 'BusinessServices::getMyStorefront');
        if ($entitlement['status'] !== 'SUCCESS') return $entitlement;
        $business = $this->dao->getMyBusinessApplication($this->db, (int) $principal['data']['user_id'], $tenantId);
        if ($business['status'] !== 'SUCCESS' || $business['data'] === []) {
            return $this->propagateFailure($business, 'BusinessServices::getMyStorefront');
        }
        $settings = $this->dao->getStorefrontSettings($this->db, $tenantId);
        if ($settings['status'] !== 'SUCCESS') {
            return $this->propagateFailure($settings, 'BusinessServices::getMyStorefront');
        }
        if ($settings['data'] === []) {
            $resArr['msgArr'][] = 'Storefront settings were not found.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['business' => $business['data'], 'storefront' => $settings['data']];
        return $resArr;
    }

    private function manageMyStorefront(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'BusinessServices::manageMyStorefront');
        }
        $userId = (int) $principal['data']['user_id'];
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        if ($tenantId === null) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        $access = $this->requireTenantPermission($userId, $tenantId, 'business.update', 'BusinessServices::manageMyStorefront');
        if ($access['status'] !== 'SUCCESS') return $access;
        $entitlement = $this->requireTenantEntitlement($tenantId, 'storefront.enabled', 'BusinessServices::manageMyStorefront');
        if ($entitlement['status'] !== 'SUCCESS') return $entitlement;
        $business = $this->dao->getMyBusinessApplication($this->db, $userId, $tenantId);
        if ($business['status'] !== 'SUCCESS' || $business['data'] === []) {
            return $this->propagateFailure($business, 'BusinessServices::manageMyStorefront');
        }
        if (($business['data']['approval_status'] ?? '') !== 'APPROVED') {
            $resArr['msgArr'][] = 'Only an approved business can manage or publish its storefront.';
            return $resArr;
        }
        if ($operation === 'unpublish') {
            $publish = false;
        } else {
            $publish = $operation === 'publish';
        }

        $transaction = $this->db->beginTransaction();
        try {
            if ($operation === 'update') {
                $settings = $this->dao->getStorefrontSettings($this->db, $tenantId);
                if ($settings['status'] !== 'SUCCESS' || $settings['data'] === []) {
                    $transaction->rollBack();
                    return $this->propagateFailure($settings, 'BusinessServices::manageMyStorefront');
                }
                $showPrices = $this->booleanValue($actionData['show_prices'] ?? $settings['data']['show_prices']);
                $acceptOrders = $this->booleanValue($actionData['accept_online_orders'] ?? $settings['data']['accept_online_orders']);
                $whatsappEnabled = $this->booleanValue($actionData['whatsapp_enabled'] ?? $settings['data']['whatsapp_enabled']);
                if ($showPrices === null || $acceptOrders === null || $whatsappEnabled === null) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'show_prices, accept_online_orders and whatsapp_enabled must be boolean values.';
                    return $resArr;
                }
                $whatsappInput = array_key_exists('whatsapp_number', $actionData)
                    ? $this->optionalText($actionData['whatsapp_number'], 25)
                    : (string) ($settings['data']['whatsapp_number'] ?? '');
                if (array_key_exists('whatsapp_number', $actionData)
                    && is_scalar($actionData['whatsapp_number'])
                    && strlen(trim((string) $actionData['whatsapp_number'])) > 25
                ) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'whatsapp_number must not exceed 25 characters.';
                    return $resArr;
                }
                $whatsapp = $whatsappInput;
                if ($whatsapp !== null && !preg_match('/^\\+?[0-9]{8,15}$/', $whatsapp)) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'whatsapp_number must contain 8 to 15 digits with an optional leading plus sign.';
                    return $resArr;
                }
                if ($whatsappEnabled === 1 && ($whatsapp === null || trim($whatsapp) === '')) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'A WhatsApp number is required when whatsapp_enabled is true.';
                    return $resArr;
                }
                $titleInput = $actionData['storefront_title'] ?? $settings['data']['storefront_title'];
                $descriptionInput = $actionData['storefront_description'] ?? $settings['data']['storefront_description'];
                $themeInput = $actionData['theme_code'] ?? $settings['data']['theme_code'];
                if ((array_key_exists('storefront_title', $actionData) && !is_scalar($titleInput))
                    || (array_key_exists('storefront_description', $actionData) && !is_scalar($descriptionInput))
                    || (array_key_exists('theme_code', $actionData) && !is_scalar($themeInput))
                    || (array_key_exists('whatsapp_number', $actionData) && !is_scalar($actionData['whatsapp_number']))
                    || (is_scalar($titleInput) && strlen(trim((string) $titleInput)) > 180)
                    || (is_scalar($descriptionInput) && strlen(trim((string) $descriptionInput)) > 500)
                    || (is_scalar($themeInput) && strlen(trim((string) $themeInput)) > 50)
                ) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'Storefront title, description or theme_code exceeds its allowed length.';
                    return $resArr;
                }
                $updated = $this->dao->updateStorefrontSettings(
                    $this->db, $tenantId, $userId,
                    $this->optionalText($titleInput, 180),
                    $this->optionalText($descriptionInput, 500),
                    $this->optionalText($themeInput, 50),
                    $showPrices, $acceptOrders, $whatsappEnabled,
                );
                if ($updated['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($updated, 'BusinessServices::manageMyStorefront');
                }
                if (array_key_exists('whatsapp_number', $actionData)) {
                    $whatsappUpdate = $this->dao->updateWhatsAppNumber($this->db, $tenantId, $userId, $whatsapp);
                    if ($whatsappUpdate['status'] !== 'SUCCESS') {
                        $transaction->rollBack();
                        return $this->propagateFailure($whatsappUpdate, 'BusinessServices::manageMyStorefront');
                    }
                }
                $transaction->commit();
                $resArr['status'] = 'SUCCESS';
                $resArr['data'] = ['tenant_id' => $tenantId];
                return $resArr;
            }

            $result = $this->dao->setStorefrontPublication($this->db, $tenantId, $userId, $publish);
            if ($result['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($result, 'BusinessServices::manageMyStorefront');
            }
            $transaction->commit();
            return $result;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            $this->logger->error('BusinessServices::manageMyStorefront failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Storefront operation failed unexpectedly.';
            $resArr['data'] = [];
            return $resArr;
        }
    }

    private function manageBusinessProfile(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'BusinessServices::manageBusinessProfile');
        }
        $tenantId = $this->positiveInt($actionData['tenant_id'] ?? null);
        $businessId = $this->positiveInt($actionData['business_id'] ?? null);
        $businessName = $this->requiredText($actionData['business_name'] ?? '', 180);
        if ($tenantId === null || $businessId === null || $businessName === null) {
            $resArr['msgArr'][] = 'tenant_id, business_id and business_name are required.';
            return $resArr;
        }
        $access = $this->requireTenantPermission((int) $principal['data']['user_id'], $tenantId, 'business.update', 'BusinessServices::manageBusinessProfile');
        if ($access['status'] !== 'SUCCESS') return $access;
        $entitlement = $this->requireTenantEntitlement($tenantId, 'business.profile', 'BusinessServices::manageBusinessProfile');
        if ($entitlement['status'] !== 'SUCCESS') return $entitlement;
        $existing = $this->dao->getMyBusinessApplication($this->db, (int) $principal['data']['user_id'], $tenantId);
        if ($existing['status'] !== 'SUCCESS') {
            return $this->propagateFailure($existing, 'BusinessServices::manageBusinessProfile');
        }
        if ($existing['data'] === [] || (int) $existing['data']['business_id'] !== $businessId
            || $existing['data']['approval_status'] !== 'APPROVED'
        ) {
            $resArr['msgArr'][] = 'Only a tenant member with business.update can update an approved business profile.';
            return $resArr;
        }
        $email = $this->optionalText($actionData['business_email'] ?? '', 190) ?? '';
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $resArr['msgArr'][] = 'A valid business_email is required.';
            return $resArr;
        }
        $resArr = $this->dao->updateBusinessProfile(
            $this->db, $tenantId, $businessId, (int) $principal['data']['user_id'], $businessName,
            $this->optionalText($actionData['business_description'] ?? '', 5000) ?? '',
            $this->optionalText($actionData['business_phone'] ?? '', 25) ?? '',
            $this->optionalText($actionData['whatsapp_number'] ?? '', 25) ?? '',
            $email,
            $this->optionalText($actionData['address_line_1'] ?? '', 190) ?? '',
            $this->optionalText($actionData['address_line_2'] ?? '', 190) ?? '',
            $this->optionalText($actionData['city'] ?? '', 100) ?? '',
            $this->optionalText($actionData['state'] ?? '', 100) ?? '',
            $this->optionalText($actionData['postal_code'] ?? '', 15) ?? '',
        );
        if ($resArr['status'] !== 'SUCCESS') {
            return $this->propagateFailure($resArr, 'BusinessServices::manageBusinessProfile');
        }
        return $resArr;
    }

    private function requireTenantPermission(int $userId, int $tenantId, string $permissionCode, string $context): array
    {
        $permission = $this->tenantDao->hasTenantPermission($this->db, $userId, $tenantId, $permissionCode);
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, $context);
        }
        if ($permission['data'] === []) {
            return ['status' => 'FAILED', 'msgArr' => [$permissionCode . ' permission is required for this tenant.'], 'data' => []];
        }
        return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => []];
    }

    private function requireTenantEntitlement(int $tenantId, string $entitlementCode, string $context): array
    {
        $entitlement = $this->tenantDao->hasTenantEntitlement($this->db, $tenantId, $entitlementCode);
        if ($entitlement['status'] !== 'SUCCESS') {
            return $this->propagateFailure($entitlement, $context);
        }
        if ($entitlement['data'] === []) {
            return ['status' => 'FAILED', 'msgArr' => ['An active subscription with ' . $entitlementCode . ' entitlement is required.'], 'data' => []];
        }
        return ['status' => 'SUCCESS', 'msgArr' => [], 'data' => []];
    }

    private function principal(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $resArr = $this->authServices->getAuth([
            'actionType' => 'getPrincipal',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($resArr['status'] !== 'SUCCESS') {
            $resArr['msgArr'][] = 'BusinessServices could not resolve the authenticated user.';
        }
        return $resArr;
    }

    private function booleanValue(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if ($value === 0 || $value === 1 || $value === '0' || $value === '1') {
            return (int) $value;
        }
        return null;
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

    private function optionalText(mixed $value, int $maxLength): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $text = trim((string) $value);
        return strlen($text) <= $maxLength ? $text : null;
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
