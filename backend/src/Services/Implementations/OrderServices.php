<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use App\Dao\OrderDao;
use App\Services\Interfaces\IOrderServices;
use App\Services\Interfaces\IAuthServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;

final readonly class OrderServices implements IOrderServices
{
    public function __construct(
        private ConnectionInterface $db,
        private OrderDao $dao,
        private IAuthServices $auth,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Level 1 dispatcher for order reads.
     */
    public function getOrders(array $param): array
    {
        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data' => array(),
        );

        if (!isset($param['actionType'])) {
            $resArr['msgArr'][] = "Missing required key 'actionType' in getOrders input.";
            return $resArr;
        }

        if (!isset($param['actionData']) || !is_array($param['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid required key 'actionData' in getOrders input.";
            return $resArr;
        }

        switch ($param['actionType']) {
            case 'getOrders':
                $resArr = $this->getOrder($param['actionData']);
                break;

            default:
                $resArr['msgArr'][] = 'Unsupported actionType for getOrders.';
                break;
        }

        return $resArr;
    }

    /**
     * Level 1 dispatcher for order management.
     */
    public function manageOrders(array $param): array
    {
        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data' => array(),
        );

        if (!isset($param['actionType'])) {
            $resArr['msgArr'][] = "Missing required key 'actionType' in manageOrders input.";
            return $resArr;
        }

        if (!isset($param['actionData']) || !is_array($param['actionData'])) {
            $resArr['msgArr'][] = "Missing or invalid required key 'actionData' in manageOrders input.";
            return $resArr;
        }

        switch ($param['actionType']) {
            case 'manageOrders':
                $resArr = $this->manageOrder($param['actionData']);
                break;

            default:
                $resArr['msgArr'][] = 'Unsupported actionType for manageOrders.';
                break;
        }

        return $resArr;
    }

    /**
     * Level 2 read worker. Existing action names and response payloads are preserved.
     */
    private function getOrder(array $actionData): array
    {
        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data' => array(),
        );

        $action = (string) ($actionData['action'] ?? '');
        $principal = $this->auth->getAuth(array(
            'actionType' => 'getAuth',
            'actionData' => array(
                'action' => 'getProfile',
                '_accessToken' => (string) ($actionData['_accessToken'] ?? ''),
            ),
        ));

        if (($principal['status'] ?? 'EXCEPTION') !== 'SUCCESS') {
            return $principal;
        }

        $userId = (int) ($principal['data']['user_id'] ?? 0);
        if ($userId < 1) {
            $resArr['msgArr'][] = 'Authenticated user could not be resolved.';
            return $resArr;
        }

        $tenantId = null;
        if (isset($actionData['tenant_id']) && $actionData['tenant_id'] !== '') {
            $validatedTenantId = filter_var($actionData['tenant_id'], FILTER_VALIDATE_INT);
            if ($validatedTenantId === false || $validatedTenantId < 1) {
                $resArr['msgArr'][] = 'Invalid tenant_id.';
                return $resArr;
            }
            $tenantId = (int) $validatedTenantId;
        }

        if ($action === 'listMyOrders') {
            $page = max(1, (int) ($actionData['page'] ?? 1));
            $pageSize = min(50, max(1, (int) ($actionData['page_size'] ?? 20)));
            $offset = ($page - 1) * $pageSize;

            $rows = $this->dao->getCustomerOrders($this->db, $userId, $tenantId, $pageSize, $offset);
            if ($rows['status'] !== 'SUCCESS') {
                $resArr = $rows;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving customer orders.';
                return $resArr;
            }

            $count = $this->dao->countCustomerOrders($this->db, $userId, $tenantId);
            if ($count['status'] !== 'SUCCESS') {
                $resArr = $count;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while counting customer orders.';
                return $resArr;
            }

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = array(
                'items' => $rows['data'],
                'pagination' => array(
                    'page' => $page,
                    'page_size' => $pageSize,
                    'total' => (int) ($count['data']['total'] ?? 0),
                ),
            );
            return $resArr;
        }

        if ($action === 'getMyOrder') {
            $orderId = filter_var($actionData['order_id'] ?? null, FILTER_VALIDATE_INT);
            if ($orderId === false || $orderId < 1) {
                $resArr['msgArr'][] = 'A valid order_id is required.';
                return $resArr;
            }

            $order = $this->dao->getCustomerOrder($this->db, $userId, (int) $orderId);
            if ($order['status'] !== 'SUCCESS') {
                $resArr = $order;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving the customer order.';
                return $resArr;
            }
            if ($order['data'] === array()) {
                $resArr['msgArr'][] = 'Order was not found.';
                return $resArr;
            }

            $orderTenantId = (int) $order['data']['tenant_id'];
            $items = $this->dao->getOrderItems($this->db, $orderTenantId, (int) $orderId);
            if ($items['status'] !== 'SUCCESS') {
                $resArr = $items;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving order items.';
                return $resArr;
            }

            $history = $this->dao->getOrderHistory($this->db, $orderTenantId, (int) $orderId);
            if ($history['status'] !== 'SUCCESS') {
                $resArr = $history;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving order history.';
                return $resArr;
            }

            $fulfilments = $this->dao->getOrderFulfilments($this->db, $orderTenantId, (int) $orderId);
            if ($fulfilments['status'] !== 'SUCCESS') {
                $resArr = $fulfilments;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving order fulfilments.';
                return $resArr;
            }

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = array(
                'order' => $order['data'],
                'items' => $items['data'],
                'status_history' => $history['data'],
                'fulfilments' => $fulfilments['data'],
            );
            return $resArr;
        }

        if (in_array($action, array('listTenantOrders', 'getTenantOrder', 'listTenantWhatsAppOrders', 'getTenantWhatsAppOrder'), true)) {
            if ($tenantId === null) {
                $resArr['msgArr'][] = 'A valid tenant_id is required.';
                return $resArr;
            }

            $permission = $this->dao->hasTenantOrderManagementPermission($this->db, $userId, $tenantId);
            if ($permission['status'] !== 'SUCCESS') {
                $resArr = $permission;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while checking tenant order permission.';
                return $resArr;
            }
            if ($permission['data'] === array()) {
                $resArr['msgArr'][] = 'You do not have permission to manage orders for this tenant.';
                return $resArr;
            }

            if (in_array($action, array('listTenantOrders', 'listTenantWhatsAppOrders'), true)) {
                $page = max(1, (int) ($actionData['page'] ?? 1));
                $pageSize = min(50, max(1, (int) ($actionData['page_size'] ?? 20)));
                $offset = ($page - 1) * $pageSize;

                $rows = $this->dao->getTenantOrders($this->db, $tenantId, $pageSize, $offset);
                if ($rows['status'] !== 'SUCCESS') {
                    $resArr = $rows;
                    $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving tenant orders.';
                    return $resArr;
                }

                $count = $this->dao->countTenantOrders($this->db, $tenantId);
                if ($count['status'] !== 'SUCCESS') {
                    $resArr = $count;
                    $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while counting tenant orders.';
                    return $resArr;
                }

                $resArr['status'] = 'SUCCESS';
                $resArr['data'] = array(
                    'items' => $rows['data'],
                    'pagination' => array(
                        'page' => $page,
                        'page_size' => $pageSize,
                        'total' => (int) ($count['data']['total'] ?? 0),
                    ),
                );
                return $resArr;
            }

            $orderId = filter_var($actionData['order_id'] ?? null, FILTER_VALIDATE_INT);
            if ($orderId === false || $orderId < 1) {
                $resArr['msgArr'][] = 'A valid order_id is required.';
                return $resArr;
            }

            $order = $this->dao->getTenantOrder($this->db, $tenantId, (int) $orderId);
            if ($order['status'] !== 'SUCCESS') {
                $resArr = $order;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving tenant order.';
                return $resArr;
            }
            if ($order['data'] === array()) {
                $resArr['msgArr'][] = 'Order was not found for this tenant.';
                return $resArr;
            }

            $items = $this->dao->getOrderItems($this->db, $tenantId, (int) $orderId);
            if ($items['status'] !== 'SUCCESS') {
                $resArr = $items;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving order items.';
                return $resArr;
            }

            $history = $this->dao->getOrderHistory($this->db, $tenantId, (int) $orderId);
            if ($history['status'] !== 'SUCCESS') {
                $resArr = $history;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving order history.';
                return $resArr;
            }

            $fulfilments = $this->dao->getOrderFulfilments($this->db, $tenantId, (int) $orderId);
            if ($fulfilments['status'] !== 'SUCCESS') {
                $resArr = $fulfilments;
                $resArr['msgArr'][] = 'Failed in OrderServices::getOrder while retrieving order fulfilments.';
                return $resArr;
            }

            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = array(
                'order' => $order['data'],
                'items' => $items['data'],
                'status_history' => $history['data'],
                'fulfilments' => $fulfilments['data'],
            );
            return $resArr;
        }

        $resArr['msgArr'][] = 'Unsupported order read action.';
        return $resArr;
    }

    /**
     * Level 2 management worker. The transaction remains owned by Core Services.
     */
    private function manageOrder(array $actionData): array
    {
        $resArr = array(
            'status' => 'FAILED',
            'msgArr' => array(),
            'data' => array(),
        );

        $action = (string) ($actionData['action'] ?? '');
        if (!in_array($action, array('changeTenantOrderStatus', 'confirmWhatsAppOrder', 'cancelWhatsAppOrder'), true)) {
            $resArr['msgArr'][] = 'Unsupported order management action.';
            return $resArr;
        }

        $principal = $this->auth->getAuth(array(
            'actionType' => 'getAuth',
            'actionData' => array(
                'action' => 'getProfile',
                '_accessToken' => (string) ($actionData['_accessToken'] ?? ''),
            ),
        ));
        if (($principal['status'] ?? 'EXCEPTION') !== 'SUCCESS') {
            return $principal;
        }

        $userId = (int) ($principal['data']['user_id'] ?? 0);
        $tenantId = filter_var($actionData['tenant_id'] ?? null, FILTER_VALIDATE_INT);
        $orderId = filter_var($actionData['order_id'] ?? null, FILTER_VALIDATE_INT);

        if ($userId < 1 || $tenantId === false || $tenantId < 1) {
            $resArr['msgArr'][] = 'A valid tenant_id is required.';
            return $resArr;
        }
        if ($orderId === false || $orderId < 1) {
            $resArr['msgArr'][] = 'A valid order_id is required.';
            return $resArr;
        }
        if (isset($actionData['note']) && !is_scalar($actionData['note'])) {
            $resArr['msgArr'][] = 'Order status note must be text.';
            return $resArr;
        }

        $note = isset($actionData['note']) ? trim((string) $actionData['note']) : null;
        if ($note !== null && strlen($note) > 500) {
            $resArr['msgArr'][] = 'Order status note must not exceed 500 characters.';
            return $resArr;
        }

        $newStatus = match ($action) {\n            'confirmWhatsAppOrder' => 'CONFIRMED',\n            'cancelWhatsAppOrder' => 'CANCELLED',\n            default => strtoupper(trim((string) ($actionData['new_status'] ?? ''))),\n        };\n        if (!in_array($newStatus, array('CONFIRMED', 'CANCELLED'), true)) {\n            $resArr['msgArr'][] = 'new_status must be CONFIRMED or CANCELLED.';\n            return $resArr;\n        }
        $transaction = $this->db->beginTransaction();

        try {
            $permission = $this->dao->hasTenantOrderManagementPermission($this->db, $userId, (int) $tenantId, true);
            if ($permission['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                $resArr = $permission;
                $resArr['msgArr'][] = 'Failed in OrderServices::manageOrder while checking tenant order permission.';
                return $resArr;
            }
            if ($permission['data'] === array()) {
                $transaction->rollBack();
                $resArr['msgArr'][] = 'You do not have permission to manage orders for this tenant.';
                return $resArr;
            }

            $order = $this->dao->getTenantOrder($this->db, (int) $tenantId, (int) $orderId, true);
            if ($order['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                $resArr = $order;
                $resArr['msgArr'][] = 'Failed in OrderServices::manageWhatsAppOrder while retrieving the order.';
                return $resArr;
            }
            if ($order['data'] === array()) {
                $transaction->rollBack();
                $resArr['msgArr'][] = 'Order was not found for this tenant.';
                return $resArr;
            }

            $oldStatus = (string) $order['data']['order_status'];
            if (!in_array($oldStatus, array('REQUESTED', 'PLACED'), true)) {
                $transaction->rollBack();
                $resArr['msgArr'][] = 'Only REQUESTED or PLACED orders can be confirmed or cancelled.';
                return $resArr;
            }

            $updated = $this->dao->updateTenantOrderStatus(
                $this->db,
                (int) $tenantId,
                (int) $orderId,
                $userId,
                $oldStatus,
                $newStatus,
            );
            if ($updated['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                $resArr = $updated;
                $resArr['msgArr'][] = 'Failed in OrderServices::manageWhatsAppOrder while updating order status.';
                return $resArr;
            }

            $history = $this->dao->createTenantOrderHistory(
                $this->db,
                (int) $tenantId,
                (int) $orderId,
                $userId,
                $oldStatus,
                $newStatus,
                $note,
                gmdate('Y-m-d H:i:s'),
            );
            if ($history['status'] !== 'SUCCESS') {
                $transaction->rollBack();
                $resArr = $history;
                $resArr['msgArr'][] = 'Failed in OrderServices::manageWhatsAppOrder while creating order history.';
                return $resArr;
            }

            $transaction->commit();
            $resArr['status'] = 'SUCCESS';
            $resArr['data'] = array(
                'order_id' => (int) $orderId,
                'order_status' => $newStatus,
            );
            return $resArr;
        } catch (Throwable $exception) {
            if ($transaction->isActive()) {
                $transaction->rollBack();
            }
            $this->logger->error('OrderServices::manageWhatsAppOrder failed.', array('exception' => $exception));
            $resArr['status'] = 'EXCEPTION';
            $resArr['msgArr'][] = 'Order management operation failed unexpectedly.';
            return $resArr;
        }
    }
}
