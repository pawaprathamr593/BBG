<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\EngagementDao;
use App\Services\Interfaces\IAuthServices;
use App\Services\Interfaces\IEngagementServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class EngagementServices implements IEngagementServices
{
    public function __construct(
        private ConnectionInterface $db,
        private EngagementDao $dao,
        private IAuthServices $authServices,
        private LoggerInterface $logger,
    ) {}

    public function getEngagement(array $engagementParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($engagementParam['actionType']) || !is_string($engagementParam['actionType']) || $engagementParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for getEngagement.';
            return $resArr;
        }
        if (!isset($engagementParam['actionData']) || !is_array($engagementParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $engagementParam['actionData'];
        $actionData['action'] = (string) $engagementParam['actionType'];
        try {
            if (($engagementParam['actionType'] ?? '') === 'listContentComments') {
                $resArr = $this->getContentComments($actionData);
            } elseif (($engagementParam['actionType'] ?? '') === 'getEngagementSummary') {
                $resArr = $this->getContentEngagementSummary($actionData);
            } else {
                $resArr['msgArr'][] = 'Unsupported engagement read action.';
            }
        } catch (Throwable $exception) {
            $this->logger->error('EngagementServices::getEngagement failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Engagement request failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    public function manageEngagement(array $engagementParam): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        if (!isset($engagementParam['actionType']) || !is_string($engagementParam['actionType']) || $engagementParam['actionType'] === '') {
            $resArr['msgArr'][] = 'Invalid actionType for manageEngagement.';
            return $resArr;
        }
        if (!isset($engagementParam['actionData']) || !is_array($engagementParam['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid 'actionData'.";
            return $resArr;
        }
        $actionData = $engagementParam['actionData'];
        $actionData['action'] = (string) $engagementParam['actionType'];
        try {
            switch ((string) $engagementParam['actionType']) {
                case 'toggleContentLike':
                    $resArr = $this->manageLike($actionData);
                    break;
                case 'createContentComment':
                    $resArr = $this->manageComment($actionData);
                    break;
                case 'updateContentComment':
                    $resArr = $this->manageUpdateComment($actionData);
                    break;
                case 'deleteContentComment':
                    $resArr = $this->manageDeleteComment($actionData);
                    break;
                case 'reportContent':
                    $resArr = $this->manageReport($actionData);
                    break;
                case 'recordContentView':
                    $resArr = $this->manageView($actionData);
                    break;
                default:
                    $resArr['msgArr'][] = 'Unsupported engagement management action.';
                    break;
            }
        } catch (Throwable $exception) {
            $this->logger->error('EngagementServices::manageEngagement failed.', ['exception' => $exception]);
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Engagement management failed unexpectedly.';
            $resArr['data'] = [];
        }
        return $resArr;
    }

    private function getContentComments(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $content = $this->resolvePublicContent($actionData, false);
        if ($content['status'] !== 'SUCCESS') {
            return $this->propagateFailure($content, 'EngagementServices::getContentComments');
        }
        $page = $this->positiveInt($actionData['page'] ?? 1) ?? 1;
        $pageSize = min(50, $this->positiveInt($actionData['page_size'] ?? 20) ?? 20);

        $userId = null;
        if (!empty($actionData['_accessToken'])) {
            $principal = $this->principal($actionData);
            if ($principal['status'] === 'SUCCESS') {
                $userId = (int) $principal['data']['user_id'];
            }
        }

        $rows = $this->dao->getComments(
            $this->db, (int) $content['data']['tenant_id'], $content['data']['content_type'],
            (int) $content['data']['content_id'], $pageSize, ($page - 1) * $pageSize,
            $userId,
        );
        if ($rows['status'] !== 'SUCCESS') {
            return $this->propagateFailure($rows, 'EngagementServices::getContentComments');
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = [
            'items' => $rows['data']['items'],
            'pagination' => [
                'page' => $page,
                'page_size' => $pageSize,
                'total_count' => $rows['data']['total_count'],
            ],
        ];
        return $resArr;
    }

    private function getContentEngagementSummary(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $content = $this->resolvePublicContent($actionData, true);
        if ($content['status'] !== 'SUCCESS') {
            return $this->propagateFailure($content, 'EngagementServices::getContentEngagementSummary');
        }
        $tenantId = (int) $content['data']['tenant_id'];
        $contentType = $content['data']['content_type'];
        $contentId = (int) $content['data']['content_id'];

        $userId = null;
        if (!empty($actionData['_accessToken'])) {
            $principal = $this->principal($actionData);
            if ($principal['status'] === 'SUCCESS') {
                $userId = (int) $principal['data']['user_id'];
            }
        }

        $reactionSummary = $this->dao->getReactionSummary($this->db, $tenantId, $contentType, $contentId, $userId);
        if ($reactionSummary['status'] !== 'SUCCESS') {
            return $this->propagateFailure($reactionSummary, 'EngagementServices::getContentEngagementSummary');
        }

        $commentRow = $this->db->createCommand("SELECT COUNT(*) AS total_comments FROM COMMENTS
            WHERE tenant_id = :tenant_id AND content_type = :content_type
                AND content_id = :content_id AND moderation_status = 'VISIBLE' AND status = 'A'",
            [':tenant_id' => $tenantId, ':content_type' => $contentType, ':content_id' => $contentId])->queryOne();
        $commentCount = (int) ($commentRow['total_comments'] ?? 0);

        $viewRow = $this->db->createCommand("SELECT COUNT(*) AS total_views FROM CONTENT_VIEWS
            WHERE tenant_id = :tenant_id AND content_type = :content_type
                AND content_id = :content_id AND status = 'A'",
            [':tenant_id' => $tenantId, ':content_type' => $contentType, ':content_id' => $contentId])->queryOne();
        $viewCount = (int) ($viewRow['total_views'] ?? 0);

        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = array_merge($reactionSummary['data'], [
            'total_comments' => $commentCount,
            'total_views' => $viewCount,
        ]);
        return $resArr;
    }

    private function manageLike(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'EngagementServices::manageLike');
        }
        $content = $this->resolvePublicContent($actionData, true);
        if ($content['status'] !== 'SUCCESS') {
            return $this->propagateFailure($content, 'EngagementServices::manageLike');
        }
        $tenantId = (int) $content['data']['tenant_id'];
        $userId = (int) $principal['data']['user_id'];

        $requestedReaction = strtoupper($this->filterText($actionData['reaction_type'] ?? 'LIKE', 20));
        if (!in_array($requestedReaction, ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'], true)) {
            $requestedReaction = 'LIKE';
        }

        $like = $this->dao->getLike($this->db, $tenantId, $userId, $content['data']['content_type'], (int) $content['data']['content_id']);
        if ($like['status'] !== 'SUCCESS') {
            return $this->propagateFailure($like, 'EngagementServices::manageLike');
        }

        if ($like['data'] === []) {
            $insertRes = $this->dao->insertLike($this->db, $tenantId, $userId, $content['data']['content_type'], (int) $content['data']['content_id'], $requestedReaction);
            if ($insertRes['status'] !== 'SUCCESS') {
                return $insertRes;
            }
        } else {
            $existingStatus = $like['data']['status'] ?? '';
            $existingReaction = $like['data']['reaction_type'] ?? 'LIKE';

            if ($existingStatus === 'A' && $existingReaction === $requestedReaction) {
                // Same reaction toggled off (unlike/unreact)
                $updateRes = $this->dao->updateLikeReaction($this->db, (int) $like['data']['id'], $userId, 'Z', null);
            } else {
                // Switching reaction or re-activating with new reaction
                $updateRes = $this->dao->updateLikeReaction($this->db, (int) $like['data']['id'], $userId, 'A', $requestedReaction);
            }
            if ($updateRes['status'] !== 'SUCCESS') {
                return $updateRes;
            }
        }

        // Return updated reaction summary
        return $this->dao->getReactionSummary($this->db, $tenantId, $content['data']['content_type'], (int) $content['data']['content_id'], $userId);
    }

    private function manageUpdateComment(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'EngagementServices::manageUpdateComment');
        }
        $content = $this->resolvePublicContent($actionData, false);
        if ($content['status'] !== 'SUCCESS') {
            return $this->propagateFailure($content, 'EngagementServices::manageUpdateComment');
        }
        $commentId = $this->positiveInt($actionData['comment_id'] ?? null);
        if ($commentId === null) {
            $resArr['msgArr'][] = 'comment_id is required.';
            return $resArr;
        }
        $commentText = $this->requiredText($actionData['comment_text'] ?? '', 3000);
        if ($commentText === null) {
            $resArr['msgArr'][] = 'comment_text is required and must not exceed 3000 characters.';
            return $resArr;
        }
        return $this->dao->updateComment(
            $this->db, (int) $content['data']['tenant_id'], $commentId,
            (int) $principal['data']['user_id'], $commentText
        );
    }

    private function manageDeleteComment(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'EngagementServices::manageDeleteComment');
        }
        $content = $this->resolvePublicContent($actionData, false);
        if ($content['status'] !== 'SUCCESS') {
            return $this->propagateFailure($content, 'EngagementServices::manageDeleteComment');
        }
        $commentId = $this->positiveInt($actionData['comment_id'] ?? null);
        if ($commentId === null) {
            $resArr['msgArr'][] = 'comment_id is required.';
            return $resArr;
        }
        $isAdmin = in_array('PLATFORM_ADMIN', is_array($principal['data']['roles'] ?? null) ? $principal['data']['roles'] : [], true);
        return $this->dao->softDeleteComment(
            $this->db, (int) $content['data']['tenant_id'], $commentId,
            (int) $principal['data']['user_id'], $isAdmin
        );
    }

    private function manageComment(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'EngagementServices::manageComment');
        }
        $content = $this->resolvePublicContent($actionData, false);
        if ($content['status'] !== 'SUCCESS') {
            return $this->propagateFailure($content, 'EngagementServices::manageComment');
        }
        $commentText = $this->requiredText($actionData['comment_text'] ?? '', 3000);
        if ($commentText === null) {
            $resArr['msgArr'][] = 'comment_text is required and must not exceed 3000 characters.';
            return $resArr;
        }
        $parentId = $this->positiveInt($actionData['parent_comment_id'] ?? null);
        if ($parentId !== null) {
            $parent = $this->dao->getParentComment(
                $this->db, (int) $content['data']['tenant_id'], $content['data']['content_type'],
                (int) $content['data']['content_id'], $parentId,
            );
            if ($parent['status'] !== 'SUCCESS' || $parent['data'] === []) {
                return $this->propagateFailure($parent, 'EngagementServices::manageComment');
            }
        }
        return $this->dao->insertComment(
            $this->db, (int) $content['data']['tenant_id'], (int) $principal['data']['user_id'],
            $content['data']['content_type'], (int) $content['data']['content_id'], $parentId, $commentText,
        );
    }

    private function manageReport(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $principal = $this->principal($actionData);
        if ($principal['status'] !== 'SUCCESS') {
            return $this->propagateFailure($principal, 'EngagementServices::manageReport');
        }
        $content = $this->resolvePublicContent($actionData, true);
        if ($content['status'] !== 'SUCCESS') {
            return $this->propagateFailure($content, 'EngagementServices::manageReport');
        }
        $reason = $this->requiredText($actionData['report_reason'] ?? '', 100);
        if ($reason === null) {
            $resArr['msgArr'][] = 'report_reason is required.';
            return $resArr;
        }
        return $this->dao->insertReport(
            $this->db, (int) $content['data']['tenant_id'], (int) $principal['data']['user_id'],
            $content['data']['content_type'], (int) $content['data']['content_id'], $reason,
            $this->filterText($actionData['report_details'] ?? '', 1000),
        );
    }

    private function manageView(array $actionData): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $content = $this->resolvePublicContent($actionData, false);
        if ($content['status'] !== 'SUCCESS') {
            return $this->propagateFailure($content, 'EngagementServices::manageView');
        }
        $userId = null;
        if (!empty($actionData['_accessToken'])) {
            $principal = $this->principal($actionData);
            if ($principal['status'] !== 'SUCCESS') {
                return $this->propagateFailure($principal, 'EngagementServices::manageView');
            }
            $userId = (int) $principal['data']['user_id'];
        }
        $visitorKey = $this->nullableText($actionData['visitor_key'] ?? null, 100);
        if ($userId === null && $visitorKey === null) {
            $resArr['msgArr'][] = 'An authenticated user or visitor_key is required to record a view.';
            return $resArr;
        }
        return $this->dao->insertView(
            $this->db, (int) $content['data']['tenant_id'], $userId, $visitorKey,
            $content['data']['content_type'], (int) $content['data']['content_id'],
        );
    }

    private function resolvePublicContent(array $actionData, bool $allowComment = true): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $contentType = strtoupper($this->filterText($actionData['content_type'] ?? '', 20));
        $contentId = $this->positiveInt($actionData['content_id'] ?? null);
        $allowed = $allowComment ? ['BUSINESS', 'PRODUCT', 'POST', 'COMMENT'] : ['BUSINESS', 'PRODUCT', 'POST'];
        if (!in_array($contentType, $allowed, true) || $contentId === null) {
            $resArr['msgArr'][] = 'content_type must be ' . implode(', ', $allowed) . ' and content_id must be valid.';
            return $resArr;
        }
        $result = $this->dao->getPublicContentTenant($this->db, $contentType, $contentId);
        if ($result['status'] !== 'SUCCESS') {
            return $this->propagateFailure($result, 'EngagementServices::resolvePublicContent');
        }
        if ($result['data'] === []) {
            $resArr['msgArr'][] = 'Published content was not found.';
            return $resArr;
        }
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = ['tenant_id' => (int) $result['data']['tenant_id'], 'content_type' => $contentType, 'content_id' => $contentId];
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
            $resArr['msgArr'][] = 'EngagementServices could not resolve the authenticated user.';
        }
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
