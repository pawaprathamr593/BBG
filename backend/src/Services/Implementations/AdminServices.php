<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\AdminDao;
use App\Services\Interfaces\IAdminServices;
use App\Services\Interfaces\IAuthServices;
use App\Utils\AwsS3Storage;
use DateTimeImmutable;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class AdminServices implements IAdminServices
{
    public function __construct(
        private ConnectionInterface $db,
        private AdminDao $dao,
        private IAuthServices $authServices,
        private AwsS3Storage $s3Storage,
        private LoggerInterface $logger,
    ) {}

    public function getAdmin(array $adminParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($adminParam['actionType']) || !is_string($adminParam['actionType']) || $adminParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for getAdmin.';
            return $resArr;
        }
        if (!isset($adminParam['actionData']) || !is_array($adminParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $adminParam['actionData'];
        $actionData['action'] = (string) $adminParam['actionType'];
        try {
            switch ((string) $adminParam['actionType']) {
                case 'listPlatformUsers':
                    $resArr = $this->getPlatformUsers($actionData);
                    break;
                case 'getPlatformUser':
                    $resArr = $this->getPlatformUser($actionData);
                    break;
                case 'listPendingBusinesses':
                    $resArr = $this->getPendingBusinesses($actionData);
                    break;
                case 'getBusinessForReview':
                    $resArr = $this->getBusinessForReview($actionData);
                    break;
                case 'listPendingSubscriptions':
                    $resArr = $this->getPendingSubscriptions($actionData);
                    break;
                case 'getCurrentPaymentQrConfig':
                    $resArr = $this->getCurrentPaymentQrConfig($actionData);
                    break;
                case 'getSubscriptionForReview':
                    $resArr = $this->getSubscriptionForReview($actionData);
                    break;
                case 'listActiveSubscriptions':
                    $resArr = $this->getActiveSubscriptions($actionData);
                    break;
                case 'listAdminCategories':
                    $resArr = $this->getAdminCategories($actionData);
                    break;
                case 'getCategoryStatistics':
                    $resArr = $this->getCategoryStatistics($actionData);
                    break;
                case 'getAdminAnalyticsSummary':
                    $resArr = $this->getAdminAnalyticsSummary($actionData);
                    break;
                case 'getAdminAnalyticsTrends':
                    $resArr = $this->getAdminAnalyticsTrends($actionData);
                    break;
                case 'listModerationQueue':
                    $resArr = $this->getModerationQueue($actionData);
                    break;
                case 'listModerationHistory':
                    $resArr = $this->getModerationHistory($actionData);
                    break;
                case 'getSafeSystemHealth':
                    $resArr = $this->getSafeSystemHealth($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported administration read action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('AdminServices::getAdmin failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Administration request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function manageAdmin(array $adminParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($adminParam['actionType']) || !is_string($adminParam['actionType']) || $adminParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for manageAdmin.';
            return $resArr;
        }
        if (!isset($adminParam['actionData']) || !is_array($adminParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $adminParam['actionData'];
        $actionData['action'] = (string) $adminParam['actionType'];
        try {
            switch ((string) $adminParam['actionType']) {
                case 'suspendPlatformUser':
                    $resArr = $this->managePlatformUser($actionData, 'SUSPENDED');
                    break;
                case 'restorePlatformUser':
                    $resArr = $this->managePlatformUser($actionData, 'ACTIVE');
                    break;
                case 'approveBusiness':
                    $resArr = $this->manageBusinessDecision($actionData, 'APPROVED');
                    break;
                case 'rejectBusiness':
                    $resArr = $this->manageBusinessDecision($actionData, 'REJECTED');
                    break;
                case 'reopenBusinessReview':
                    $resArr = $this->manageBusinessDecision($actionData, 'PENDING');
                    break;
                case 'approveSubscription':
                    $resArr = $this->manageSubscriptionDecision($actionData, true);
                    break;
                case 'rejectSubscription':
                    $resArr = $this->manageSubscriptionDecision($actionData, false);
                    break;
                case 'generatePaymentQrUploadUrl':
                    $resArr = $this->generatePaymentQrUploadUrl($actionData);
                    break;
                case 'savePaymentQrConfig':
                    $resArr = $this->savePaymentQrConfig($actionData);
                    break;
                case 'createCategory':
                    $resArr = $this->manageCategory($actionData, 'create');
                    break;
                case 'updateCategory':
                    $resArr = $this->manageCategory($actionData, 'update');
                    break;
                case 'deleteCategory':
                    $resArr = $this->manageCategory($actionData, 'delete');
                    break;
                case 'applyModerationAction':
                    $resArr = $this->manageModerationAction($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported administration management action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('AdminServices::manageAdmin failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Administration management failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getPlatformUsers(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'user.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getPlatformUsers');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(100, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $search = $this->filterText($actionData['search'] ?? '', 100);
        $rows = $this->dao->getUsers($this->db, $search, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'AdminServices::getPlatformUsers');
        }
        $count = $this->dao->countUsers($this->db, $search);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'AdminServices::getPlatformUsers');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getPlatformUser(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'user.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getPlatformUser');
        }
        $userId = $this->positiveInt($actionData['user_id'] ?? null);
        if ($userId === null) {
            $resArr['msgArr'][] = 'A valid user_id is required.';
            return $resArr;
        }
        $result = $this->dao->getUser($this->db, $userId);
        if ($result['status'] !== 'SUCCESS' || $result['data'] === []) {
            return $this->propagateFailure($result, 'AdminServices::getPlatformUser');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function managePlatformUser(array $actionData, string $newStatus): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'user.update');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::managePlatformUser');
        }
        $userId = $this->positiveInt($actionData['user_id'] ?? null);
        $adminId = (int) $context['data']['user_id'];
        if ($userId === null || $userId === $adminId) {
            $resArr['msgArr'][] = 'A valid user_id other than the current administrator is required.';
            return $resArr;
        }
        return $this->dao->setUserAccountStatus($this->db, $userId, $adminId, $newStatus);
    }

    private function getPendingBusinesses(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'business.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getPendingBusinesses');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(100, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getPendingBusinesses($this->db, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'AdminServices::getPendingBusinesses');
        }
        $count = $this->dao->countPendingBusinesses($this->db);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'AdminServices::getPendingBusinesses');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getBusinessForReview(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'business.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getBusinessForReview');
        }
        $businessId = $this->positiveInt($actionData['business_id'] ?? null);
        if ($businessId === null) {
            $resArr['msgArr'][] = 'A valid business_id is required.';
            return $resArr;
        }
        $result = $this->dao->getBusinessForReview($this->db, $businessId);
        if ($result['status'] !== 'SUCCESS' || $result['data'] === []) {
            return $this->propagateFailure($result, 'AdminServices::getBusinessForReview');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        if (!empty($resArr['data']['payment_qr_file_path'])) {
            $resArr['data']['payment_qr_url'] = $this->s3Storage->createDownloadUrl((string) $resArr['data']['payment_qr_file_path']);
            unset($resArr['data']['payment_qr_file_path']);
        }
        if (!empty($resArr['data']['proof_file_path'])) {
            $resArr['data']['receipt_url'] = $this->s3Storage->createDownloadUrl((string) $resArr['data']['proof_file_path']);
            unset($resArr['data']['proof_file_path']);
        }
        return $resArr;
    }

    private function manageBusinessDecision(array $actionData, string $newStatus): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'business.approve');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::manageBusinessDecision');
        }
        $businessId = $this->positiveInt($actionData['business_id'] ?? null);
        if ($businessId === null) {
            $resArr['msgArr'][] = 'A valid business_id is required.';
            return $resArr;
        }
        $business = $this->dao->getBusinessForReview($this->db, $businessId);
        if ($business['status'] !== 'SUCCESS' || $business['data'] === []) {
            return $this->propagateFailure($business, 'AdminServices::manageBusinessDecision');
        }
        $oldStatus = (string) $business['data']['approval_status'];
        if ($newStatus === 'PENDING' && $oldStatus !== 'REJECTED') {
            $resArr['msgArr'][] = 'Only rejected business applications can be reopened.';
            return $resArr;
        }
        if ($newStatus !== 'PENDING' && $oldStatus !== 'PENDING') {
            $resArr['msgArr'][] = 'Only pending business applications can be approved or rejected.';
            return $resArr;
        }
        $reason = $this->nullableText($actionData['reason'] ?? null, 500);
        if ($newStatus === 'REJECTED' && $reason === null) {
            $resArr['msgArr'][] = 'A rejection reason is required.';
            return $resArr;
        }
        if ($newStatus === 'APPROVED') {
            $activeSubscription = $this->dao->getActiveSubscriptionForTenant($this->db, (int) $business['data']['tenant_id']);
            if ($activeSubscription['status'] !== 'SUCCESS') {
                return $this->propagateFailure($activeSubscription, 'AdminServices::manageBusinessDecision');
            }
            if ($activeSubscription['data'] === []) {
                $resArr['msgArr'][] = 'Approve a payment-backed subscription before approving this business application.';
                return $resArr;
            }
        }
        $transaction = $this->db->beginTransaction();
        try {
            $result = $this->dao->setBusinessApproval(
                $this->db, $businessId, (int) $business['data']['tenant_id'],
                (int) $context['data']['user_id'], $newStatus, $reason,
            );
            if ($result['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($result, 'AdminServices::manageBusinessDecision');
            }
            $transaction->commit();
            return $result;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            throw $exception;
        }
    }

    private function getPendingSubscriptions(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'subscription.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getPendingSubscriptions');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(100, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getPendingSubscriptions($this->db, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'AdminServices::getPendingSubscriptions');
        }
        $count = $this->dao->countPendingSubscriptions($this->db);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'AdminServices::getPendingSubscriptions');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getSubscriptionForReview(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'subscription.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getSubscriptionForReview');
        }
        $subscriptionId = $this->positiveInt($actionData['subscription_id'] ?? null);
        if ($subscriptionId === null) {
            $resArr['msgArr'][] = 'A valid subscription_id is required.';
            return $resArr;
        }
        $subscription = $this->dao->getSubscriptionForReview($this->db, $subscriptionId);
        if ($subscription['status'] !== 'SUCCESS' || $subscription['data'] === []) {
            return $this->propagateFailure($subscription, 'AdminServices::getSubscriptionForReview');
        }
        $proofs = $this->dao->getSubscriptionProofs($this->db, (int) $subscription['data']['tenant_id'], $subscriptionId);
        if ($proofs['status'] !== 'SUCCESS') {
            return $this->propagateFailure($proofs, 'AdminServices::getSubscriptionForReview');
        }
        foreach ($proofs['data'] as &$proof) {
            if (!empty($proof['proof_file_path'])) {
                $proof['proof_file_url'] = $this->s3Storage->createDownloadUrl((string) $proof['proof_file_path']);
            }
        }
        unset($proof);
        if (!empty($subscription['data']['payment_qr_file_path'])) {
            $subscription['data']['payment_qr_file_url'] = $this->s3Storage->createDownloadUrl((string) $subscription['data']['payment_qr_file_path']);
        }
        $history = $this->dao->getSubscriptionReviewHistory($this->db, (int) $subscription['data']['tenant_id'], $subscriptionId);
        if ($history['status'] !== 'SUCCESS') {
            return $this->propagateFailure($history, 'AdminServices::getSubscriptionForReview');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['subscription' => $subscription['data'], 'proofs' => $proofs['data'], 'review_history' => $history['data']];
        return $resArr;
    }

    private function getCurrentPaymentQrConfig(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'subscription.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getCurrentPaymentQrConfig');
        }
        $result = $this->dao->getActivePaymentQrConfig($this->db);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'AdminServices::getCurrentPaymentQrConfig');
        }
        if ($result['data'] !== []) {
            $result['data']['qr_url'] = $this->s3Storage->createDownloadUrl((string) $result['data']['qr_file_path']);
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function generatePaymentQrUploadUrl(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'subscription.update');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::generatePaymentQrUploadUrl');
        }
        $fileName = $this->requiredText($actionData['original_file_name'] ?? '', 255);
        $mimeType = strtolower($this->requiredText($actionData['mime_type'] ?? '', 100) ?? '');
        $fileSize = $this->positiveInt($actionData['file_size_bytes'] ?? null);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if ($fileName === null || !isset($extensions[$mimeType]) || $fileSize === null
            || $fileSize > $this->s3Storage->getMaxUploadBytes()) {
            $resArr['msgArr'][] = 'A valid QR image (JPG, PNG or WEBP) up to 10 MB is required.';
            return $resArr;
        }
        $key = 'platform/payment-qr/' . bin2hex(random_bytes(16)) . '.' . $extensions[$mimeType];
        $upload = $this->s3Storage->createUploadUrl($key, $mimeType);
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'upload_url' => $upload['url'], 'object_key' => $key, 'method' => 'PUT',
            'headers' => ['Content-Type' => $mimeType], 'expires_in' => $upload['expires_in'],
        ];
        return $resArr;
    }

    private function savePaymentQrConfig(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'subscription.update');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::savePaymentQrConfig');
        }
        $payee = $this->requiredText($actionData['payee_name'] ?? '', 150);
        $upi = $this->requiredText($actionData['upi_id'] ?? '', 150);
        $path = $this->requiredText($actionData['qr_file_path'] ?? '', 500);
        $instructions = $this->nullableText($actionData['payment_instructions'] ?? null, 1000);
        if ($payee === null || $upi === null || $path === null
            || preg_match('/^platform\/payment-qr\/[a-f0-9]{32}\.(jpg|png|webp)$/D', $path) !== 1
            || !preg_match('/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/', $upi)) {
            $resArr['msgArr'][] = 'Valid payee_name, UPI ID and server-issued QR image path are required.';
            return $resArr;
        }
        try {
            $stored = $this->s3Storage->headObject($path);
            $mime = strtolower((string) ($stored['ContentType'] ?? ''));
            $bytes = (int) ($stored['ContentLength'] ?? 0);
            $signature = $this->s3Storage->getObjectPrefix($path);
            $valid = match ($mime) {
                'image/jpeg' => str_starts_with($signature, "\xFF\xD8\xFF"),
                'image/png' => str_starts_with($signature, "\x89PNG\r\n\x1A\n"),
                'image/webp' => str_starts_with($signature, 'RIFF') && substr($signature, 8, 4) === 'WEBP',
                default => false,
            };
            if (!$valid || $bytes < 1 || $bytes > $this->s3Storage->getMaxUploadBytes()
                || pathinfo($path, PATHINFO_EXTENSION) !== match ($mime) {
                    'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', default => '',
                }) {
                $resArr['msgArr'][] = 'The uploaded QR image failed storage verification.';
                return $resArr;
            }
        } catch (Throwable $exception) {
            $this->logger->warning('Platform payment QR verification failed.', ['exception' => $exception]);
            $resArr['msgArr'][] = 'The uploaded QR image could not be verified in storage.';
            return $resArr;
        }
        $transaction = $this->db->beginTransaction();
        try {
            $result = $this->dao->insertPaymentQrConfig(
                $this->db, $payee, $upi, $path, $instructions, (int) $context['data']['user_id'],
            );
            if ($result['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($result, 'AdminServices::savePaymentQrConfig');
            }
            $transaction->commit();
            return $result;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) $transaction->rollBack();
            throw $exception;
        }
    }

    private function getActiveSubscriptions(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'subscription.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getActiveSubscriptions');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(100, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getActiveSubscriptions($this->db, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'AdminServices::getActiveSubscriptions');
        }
        $count = $this->dao->countActiveSubscriptions($this->db);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'AdminServices::getActiveSubscriptions');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function manageSubscriptionDecision(array $actionData, bool $approve): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'subscription.approve');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::manageSubscriptionDecision');
        }
        $subscriptionId = $this->positiveInt($actionData['subscription_id'] ?? null);
        if ($subscriptionId === null) {
            $resArr['msgArr'][] = 'A valid subscription_id is required.';
            return $resArr;
        }
        $subscription = $this->dao->getSubscriptionForReview($this->db, $subscriptionId);
        if ($subscription['status'] !== 'SUCCESS' || $subscription['data'] === []) {
            return $this->propagateFailure($subscription, 'AdminServices::manageSubscriptionDecision');
        }
        $subscriptionData = $subscription['data'];
        $currentStatus = (string) ($subscriptionData['subscription_status'] ?? '');
        if ($currentStatus !== 'PENDING') {
            if ($approve && $currentStatus === 'ACTIVE' && is_string($subscriptionData['bcn'] ?? null)
                && $subscriptionData['bcn'] !== '') {
                return [
                    'status' => 'SUCCESS',
                    'msgArr' => [],
                    'data' => [
                        'subscription_id' => $subscriptionId,
                        'subscription_status' => 'ACTIVE',
                        'bcn' => $subscriptionData['bcn'],
                    ],
                ];
            }
            $resArr['msgArr'][] = 'Only pending subscriptions can be approved or rejected.';
            return $resArr;
        }
        $tenantId = (int) $subscriptionData['tenant_id'];
        $adminId = (int) $context['data']['user_id'];
        $planId = $approve ? $this->positiveInt($subscriptionData['plan_id'] ?? null) : null;
        if ($approve && $planId === null) {
            $resArr['msgArr'][] = 'The subscription has no valid plan ID and cannot be approved.';
            return $resArr;
        }

        $transaction = $this->db->beginTransaction();
        try {
            if ($approve) {
                $proofs = $this->dao->getSubscriptionProofs($this->db, $tenantId, $subscriptionId);
                if ($proofs['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($proofs, 'AdminServices::manageSubscriptionDecision');
                }
                $hasPendingProof = false;
                foreach ($proofs['data'] as $proof) {
                    if (($proof['review_status'] ?? '') === 'PENDING') {
                        $hasPendingProof = true;
                        break;
                    }
                }
                if (!$hasPendingProof) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'A pending payment proof must be reviewed before approving the subscription.';
                    return $resArr;
                }
                $startsOn = $this->dateTimeText($actionData['starts_on'] ?? null);
                $endsOn = $this->dateTimeText($actionData['ends_on'] ?? null);
                if ($startsOn === null || $endsOn === null || strtotime($endsOn) <= strtotime($startsOn)) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'Valid starts_on and ends_on are required; ends_on must be later than starts_on.';
                    return $resArr;
                }
                $result = $this->dao->approveSubscription($this->db, $subscriptionId, $tenantId, $adminId, $startsOn, $endsOn);
            } else {
                $reason = $this->requiredText($actionData['reason'] ?? '', 500);
                if ($reason === null) {
                    $transaction->rollBack();
                    $resArr['msgArr'][] = 'A rejection reason is required.';
                    return $resArr;
                }
                $result = $this->dao->rejectSubscription($this->db, $subscriptionId, $tenantId, $adminId, $reason);
            }

            if ($result['status'] !== 'SUCCESS') {
                if ($approve) {
                    $latest = $this->dao->getSubscriptionBcnState($this->db, $subscriptionId, $tenantId);
                    $latestData = $latest['data'] ?? [];
                    if ($latest['status'] === 'SUCCESS'
                        && ($latestData['subscription_status'] ?? '') === 'ACTIVE'
                        && is_string($latestData['bcn'] ?? null) && $latestData['bcn'] !== '') {
                        $transaction->rollBack();
                        return [
                            'status' => 'SUCCESS',
                            'msgArr' => [],
                            'data' => [
                                'subscription_id' => $subscriptionId,
                                'subscription_status' => 'ACTIVE',
                                'bcn' => $latestData['bcn'],
                            ],
                        ];
                    }
                }
                $transaction->rollBack();
                return $this->propagateFailure($result, 'AdminServices::manageSubscriptionDecision');
            }

            if ($approve) {
                $serialResult = $this->dao->allocateBcnSerial($this->db, $adminId);
                if ($serialResult['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($serialResult, 'AdminServices::manageSubscriptionDecision');
                }
                $expiry = new DateTimeImmutable($endsOn);
                $planSegment = str_pad((string) $planId, 2, '0', STR_PAD_LEFT);
                $serialSegment = str_pad((string) $serialResult['data']['serial'], 5, '0', STR_PAD_LEFT);
                $bcn = 'BCN-' . $expiry->format('ym') . $planSegment . '-' . $serialSegment;
                $savedBcn = $this->dao->saveSubscriptionBcn($this->db, $subscriptionId, $tenantId, $bcn, $adminId);
                if ($savedBcn['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($savedBcn, 'AdminServices::manageSubscriptionDecision');
                }
                $result['data']['bcn'] = $bcn;
            }

            $transaction->commit();
            return $result;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            throw $exception;
        }
    }

    private function getAdminCategories(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'categories.manage');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getAdminCategories');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(100, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $search = $this->filterText($actionData['search'] ?? '', 100);
        $rows = $this->dao->getCategories($this->db, $search, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'AdminServices::getAdminCategories');
        }
        $count = $this->dao->countCategories($this->db, $search);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'AdminServices::getAdminCategories');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getCategoryStatistics(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'categories.manage');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getCategoryStatistics');
        }
        $categoryId = $this->positiveInt($actionData['category_id'] ?? null);
        if ($categoryId === null) {
            $resArr['msgArr'][] = 'A valid category_id is required.';
            return $resArr;
        }
        $result = $this->dao->getCategoryStatistics($this->db, $categoryId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'AdminServices::getCategoryStatistics');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function manageCategory(array $actionData, string $operation): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $permissionCode = match ($operation) {
            'create' => 'categories.manage',
            'update' => 'categories.manage',
            'delete' => 'categories.manage',
            default => '',
        };
        $context = $this->platformContext($actionData, $permissionCode);
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::manageCategory');
        }
        $adminId = (int) $context['data']['user_id'];
        $categoryId = $this->positiveInt($actionData['category_id'] ?? null);
        if ($operation !== 'create' && $categoryId === null) {
            $resArr['msgArr'][] = 'A valid category_id is required.';
            return $resArr;
        }
        if ($operation === 'delete') {
            $dependencies = $this->dao->hasCategoryDependencies($this->db, $categoryId);
            if ($dependencies['status'] !== 'SUCCESS') {
                return $this->propagateFailure($dependencies, 'AdminServices::manageCategory');
            }
            if ($dependencies['data'] !== []) {
                $resArr['msgArr'][] = 'Category cannot be deleted while active businesses or products reference it.';
                return $resArr;
            }
            return $this->dao->softDeleteCategory($this->db, $categoryId, $adminId);
        }
        $code = strtoupper($this->requiredText($actionData['category_code'] ?? '', 50) ?? '');
        $name = $this->requiredText($actionData['category_name'] ?? '', 120);
        $type = strtoupper($this->requiredText($actionData['category_type'] ?? '', 20) ?? '');
        $description = $this->filterText($actionData['description'] ?? '', 500);
        $parentId = $this->positiveInt($actionData['parent_category_id'] ?? null);
        $displayOrder = $this->integerValue($actionData['display_order'] ?? 0);
        if ($code === '' || $name === null || !in_array($type, ['BUSINESS', 'PRODUCT'], true)
            || $displayOrder === null || $displayOrder < 0
        ) {
            $resArr['msgArr'][] = 'category_code, category_name, category_type (BUSINESS or PRODUCT) and non-negative display_order are required.';
            return $resArr;
        }
        if ($parentId !== null && $categoryId !== null && $parentId === $categoryId) {
            $resArr['msgArr'][] = 'A category cannot be its own parent.';
            return $resArr;
        }
        $codeCheck = $this->dao->isCategoryCodeAvailable($this->db, $code, $categoryId ?? 0);
        if ($codeCheck['status'] !== 'SUCCESS') {
            return $this->propagateFailure($codeCheck, 'AdminServices::manageCategory');
        }
        if ($codeCheck['data'] !== []) {
            $resArr['msgArr'][] = 'category_code is already in use.';
            return $resArr;
        }
        if ($operation === 'create') {
            return $this->dao->insertCategory($this->db, $parentId, $code, $name, $type, $description, $displayOrder, $adminId);
        }
        return $this->dao->updateCategory($this->db, $categoryId, $parentId, $code, $name, $type, $description, $displayOrder, $adminId);
    }

    private function getAdminAnalyticsSummary(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'report.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getAdminAnalyticsSummary');
        }
        $result = $this->dao->getAnalyticsSummary($this->db);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'AdminServices::getAdminAnalyticsSummary');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $result['data'];
        return $resArr;
    }

    private function getAdminAnalyticsTrends(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'report.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getAdminAnalyticsTrends');
        }
        $startDate = $this->dateText($actionData['start_date'] ?? null);
        $endDate = $this->dateText($actionData['end_date'] ?? null);
        if ($startDate === null || $endDate === null || $endDate < $startDate
            || (strtotime($endDate) - strtotime($startDate)) > (366 * 86400)
        ) {
            $resArr['msgArr'][] = 'Valid start_date and end_date within a 366-day range are required.';
            return $resArr;
        }
        $result = $this->dao->getAnalyticsTrends($this->db, $startDate, $endDate);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'AdminServices::getAdminAnalyticsTrends');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $result['data']];
        return $resArr;
    }

    private function getModerationQueue(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'moderation.manage');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getModerationQueue');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(100, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getModerationQueue($this->db, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'AdminServices::getModerationQueue');
        }
        $count = $this->dao->countModerationQueue($this->db);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'AdminServices::getModerationQueue');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function getModerationHistory(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'moderation.manage');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getModerationHistory');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(100, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);
        $rows = $this->dao->getModerationHistory($this->db, $pageSize, ($page - 1) * $pageSize);
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'AdminServices::getModerationHistory');
        }
        $count = $this->dao->countModerationHistory($this->db);
        if ($count['status'] !== 'SUCCESS') {
            return $this->propagateFailure($count, 'AdminServices::getModerationHistory');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['items' => $rows['data'], 'pagination' => [
            'page' => $page, 'page_size' => $pageSize, 'total' => (int) ($count['data']['total'] ?? 0),
        ]];
        return $resArr;
    }

    private function manageModerationAction(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'moderation.manage');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::manageModerationAction');
        }
        $reportId = $this->positiveInt($actionData['report_id'] ?? null);
        $actionType = strtoupper($this->filterText($actionData['action_type'] ?? '', 30));
        $reason = $this->requiredText($actionData['reason'] ?? '', 500);
        if ($reportId === null || $reason === null
            || !in_array($actionType, ['UNPUBLISH_POST', 'UNPUBLISH_PRODUCT', 'DISMISS_REPORT'], true)
        ) {
            $resArr['msgArr'][] = 'report_id, reason and a supported action_type are required.';
            return $resArr;
        }
        $report = $this->dao->getModerationReport($this->db, $reportId);
        if ($report['status'] !== 'SUCCESS' || $report['data'] === []) {
            return $this->propagateFailure($report, 'AdminServices::manageModerationAction');
        }
        if (($report['data']['report_status'] ?? '') !== 'OPEN') {
            $resArr['msgArr'][] = 'Only open reports can be moderated.';
            return $resArr;
        }
        $contentType = (string) $report['data']['content_type'];
        if (($actionType === 'UNPUBLISH_POST' && $contentType !== 'POST')
            || ($actionType === 'UNPUBLISH_PRODUCT' && $contentType !== 'PRODUCT')
        ) {
            $resArr['msgArr'][] = 'Moderation action does not match the reported content type.';
            return $resArr;
        }
        $adminId = (int) $context['data']['user_id'];
        $tenantId = $report['data']['tenant_id'] === null ? null : (int) $report['data']['tenant_id'];
        $transaction = $this->db->beginTransaction();
        try {
            if ($actionType !== 'DISMISS_REPORT') {
                $contentResult = $this->dao->updateReportedContent(
                    $this->db, $contentType, (int) $report['data']['content_id'], $adminId, $actionType,
                );
                if ($contentResult['status'] !== 'SUCCESS') {
                    $transaction->rollBack();
                    return $this->propagateFailure($contentResult, 'AdminServices::manageModerationAction');
                }
            }
            $reportStatus = $actionType === 'DISMISS_REPORT' ? 'DISMISSED' : 'RESOLVED';
            $statusResult = $this->dao->updateReportStatus($this->db, $reportId, $adminId, $reportStatus);
            if ($statusResult['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($statusResult, 'AdminServices::manageModerationAction');
            }
            $log = $this->dao->insertModerationLog(
                $this->db, $tenantId, $adminId, $contentType, (int) $report['data']['content_id'], $actionType, $reason,
            );
            if ($log['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                return $this->propagateFailure($log, 'AdminServices::manageModerationAction');
            }
            $transaction->commit();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = ['report_id' => $reportId, 'report_status' => $reportStatus, 'action_type' => $actionType];
            return $resArr;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            throw $exception;
        }
    }

    private function getSafeSystemHealth(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $context = $this->platformContext($actionData, 'system.health.view');
        if ($context['status'] !== 'SUCCESS') {
            return $this->propagateFailure($context, 'AdminServices::getSafeSystemHealth');
        }
        $result = $this->dao->healthCheck($this->db);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'AdminServices::getSafeSystemHealth');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'database_status' => ((int) ($result['data']['database_ok'] ?? 0)) === 1 ? 'UP' : 'UNKNOWN',
            'checked_on' => $result['data']['checked_on'] ?? null,
            'php_version' => PHP_VERSION,
        ];
        return $resArr;
    }

    private function platformContext(array $actionData, string $permissionCode): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->authServices->getAuth([
            'actionType' => 'getPrincipal',
            'actionData' => ['action' => 'getPrincipal', '_accessToken' => (string) ($actionData['_accessToken'] ?? '')],
        ]);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'AdminServices::platformContext');
        }
        // Map service-level capability names to the platform RBAC seed codes.
        $platformPermissionCode = match ($permissionCode) {
            'user.view', 'user.update' => 'PLATFORM_USERS_MANAGE',
            'business.view', 'business.approve' => 'BUSINESS_APPROVE',
            'subscription.view', 'subscription.update', 'subscription.approve' => 'SUBSCRIPTIONS_APPROVE',
            'categories.manage' => 'CATEGORIES_MANAGE',
            'report.view' => 'ANALYTICS_VIEW',
            'moderation.manage' => 'MODERATION_MANAGE',
            'system.health.view' => 'SYSTEM_HEALTH_VIEW',
            default => $permissionCode,
        };
        $permission = $this->dao->hasPlatformPermission(
            $this->db, (int) $principal['data']['user_id'], $platformPermissionCode,
        );
        if ($permission['status'] !== 'SUCCESS') {
            return $this->propagateFailure($permission, 'AdminServices::platformContext');
        }
        if ($permission['data'] === []) {
            $resArr['msgArr'][] = 'Platform permission is required for this operation.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['user_id' => (int) $principal['data']['user_id']];
        return $resArr;
    }

    private function dateTimeText(mixed $value): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value) || trim((string) $value) === '') {
            return null;
        }
        try {
            return (new DateTimeImmutable((string) $value))->format('Y-m-d H:i:s');
        } catch (Throwable) {
            return null;
        }
    }

    private function dateText(mixed $value): ?string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return null;
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', (string) $value);
        return $date !== false && $date->format('Y-m-d') === (string) $value ? (string) $value : null;
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

    private function filterText(mixed $value, int $maxLength): string
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value)) {
            return '';
        }
        return substr(trim((string) $value), 0, $maxLength);
    }

    private function positiveInt(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $number = filter_var($value, FILTER_VALIDATE_INT);
        return $number !== false && $number > 0 ? (int) $number : null;
    }

    private function integerValue(mixed $value): ?int
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!is_scalar($value) || filter_var($value, FILTER_VALIDATE_INT) === false) {
            return null;
        }
        return (int) $value;
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
