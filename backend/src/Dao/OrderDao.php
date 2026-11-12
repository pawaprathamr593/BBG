<?php
declare(strict_types=1);
namespace App\Dao;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;
final readonly class OrderDao {
    public function __construct(private LoggerInterface $logger) {}
    public function getCustomerOrders(ConnectionInterface $db,int $userId,?int $tenantId,int $limit,int $offset): array {
        $where=$tenantId===null?'':' AND o.tenant_id=:tenant';
        $params=[':user'=>$userId,':limit'=>$limit,':offset'=>$offset];if($tenantId!==null)$params[':tenant']=$tenantId;
        try{$rows=$db->createCommand("SELECT o.id,o.tenant_id,o.order_number,o.order_status,o.payment_status,o.fulfilment_status,o.ordered_on,o.subtotal,o.tax_amount,o.grand_total,t.default_currency,bp.business_name FROM ORDERS o JOIN TENANT_CUSTOMERS tc ON tc.id=o.tenant_customer_id AND tc.tenant_id=o.tenant_id AND tc.status='A' JOIN CUSTOMER_IDENTITIES ci ON ci.id=tc.customer_identity_id AND ci.user_id=:user AND ci.status='A' JOIN TENANTS t ON t.id=o.tenant_id AND t.status='A' LEFT JOIN BUSINESS_PROFILES bp ON bp.tenant_id=o.tenant_id AND bp.status='A' WHERE o.status='A'".$where." ORDER BY o.ordered_on DESC,o.id DESC LIMIT :limit OFFSET :offset",$params)->queryAll();return $this->ok(is_array($rows)?$rows:[]);}
        catch(Throwable $e){return $this->error('getCustomerOrders',$e);}
    }
    public function countCustomerOrders(ConnectionInterface $db,int $userId,?int $tenantId): array {
        $where=$tenantId===null?'':' AND o.tenant_id=:tenant';$params=[':user'=>$userId];if($tenantId!==null)$params[':tenant']=$tenantId;
        return $this->one($db,"SELECT COUNT(*) total FROM ORDERS o JOIN TENANT_CUSTOMERS tc ON tc.id=o.tenant_customer_id AND tc.tenant_id=o.tenant_id AND tc.status='A' JOIN CUSTOMER_IDENTITIES ci ON ci.id=tc.customer_identity_id AND ci.user_id=:user AND ci.status='A' WHERE o.status='A'".$where,$params,'countCustomerOrders');
    }
    public function getCustomerOrder(ConnectionInterface $db,int $userId,int $orderId): array {
        return $this->one($db,"SELECT o.id,o.tenant_id,o.order_number,o.order_channel,o.order_status,o.payment_status,o.fulfilment_status,o.ordered_on,o.subtotal,o.discount_amount,o.tax_amount,o.delivery_fee,o.grand_total,o.amount_paid,o.notes,t.default_currency,bp.business_name FROM ORDERS o JOIN TENANT_CUSTOMERS tc ON tc.id=o.tenant_customer_id AND tc.tenant_id=o.tenant_id AND tc.status='A' JOIN CUSTOMER_IDENTITIES ci ON ci.id=tc.customer_identity_id AND ci.user_id=:user AND ci.status='A' JOIN TENANTS t ON t.id=o.tenant_id AND t.status='A' LEFT JOIN BUSINESS_PROFILES bp ON bp.tenant_id=o.tenant_id AND bp.status='A' WHERE o.id=:order AND o.status='A' LIMIT 1",[':user'=>$userId,':order'=>$orderId],'getCustomerOrder');
    }
    public function getOrderItems(ConnectionInterface $db,int $tenantId,int $orderId): array {
        try{$rows=$db->createCommand("SELECT id,product_id,variant_id,product_name_snapshot,product_code_snapshot,unit_id,quantity,unit_price,discount_amount,tax_rate,tax_amount,line_total FROM ORDER_ITEMS WHERE tenant_id=:tenant AND order_id=:order AND status='A' ORDER BY id",[':tenant'=>$tenantId,':order'=>$orderId])->queryAll();return $this->ok(is_array($rows)?$rows:[]);}
        catch(Throwable $e){return $this->error('getOrderItems',$e);}
    }
    public function getOrderHistory(ConnectionInterface $db,int $tenantId,int $orderId): array {
        try{$rows=$db->createCommand("SELECT old_status,new_status,change_note,changed_on FROM ORDER_STATUS_HISTORY WHERE tenant_id=:tenant AND order_id=:order AND status='A' ORDER BY changed_on,id",[':tenant'=>$tenantId,':order'=>$orderId])->queryAll();return $this->ok(is_array($rows)?$rows:[]);}
        catch(Throwable $e){return $this->error('getOrderHistory',$e);}
    }
    public function getOrderFulfilments(ConnectionInterface $db,int $tenantId,int $orderId): array {
        try{$rows=$db->createCommand("SELECT fulfilment_type,fulfilment_status,delivery_partner,tracking_reference,dispatched_on,delivered_on,recipient_name,recipient_mobile,delivery_address_snapshot FROM ORDER_FULFILMENTS WHERE tenant_id=:tenant AND order_id=:order AND status='A' ORDER BY id",[':tenant'=>$tenantId,':order'=>$orderId])->queryAll();return $this->ok(is_array($rows)?$rows:[]);}
        catch(Throwable $e){return $this->error('getOrderFulfilments',$e);}
    }
    private function one(ConnectionInterface $db,string $sql,array $params,string $op): array {try{$row=$db->createCommand($sql,$params)->queryOne();return $this->ok(is_array($row)?$row:[]);}catch(Throwable $e){return $this->error($op,$e);}}
    private function ok(array $data): array{return ['status'=>'SUCCESS','msgArr'=>[],'data'=>$data];}
    private function error(string $op,Throwable $e): array{$this->logger->error('OrderDao::'.$op.' failed.',['exception'=>$e]);return ['status'=>'EXCEPTION','msgArr'=>['Order data operation failed.'],'data'=>[]];}
}
