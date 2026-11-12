<?php
declare(strict_types=1);
namespace App\Dao;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;
final readonly class CartDao {
    public function __construct(private LoggerInterface $logger) {}
    public function getEnabledStorefront(ConnectionInterface $db, int $tenantId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT bp.id, bp.whatsapp_number, t.default_currency, ss.accept_online_orders, ss.whatsapp_enabled FROM BUSINESS_PROFILES bp JOIN TENANTS t ON t.id=bp.tenant_id AND t.status='A' JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id=bp.tenant_id AND ss.status='A' WHERE bp.tenant_id=:tenant AND bp.approval_status='APPROVED' AND bp.publication_status='PUBLISHED' AND bp.status='A' AND t.tenant_status='ACTIVE' AND ss.storefront_status='ACTIVE' AND (ss.accept_online_orders=1 OR ss.whatsapp_enabled=1) LIMIT 1", [':tenant'=>$tenantId], 'getEnabledStorefront');
    }
    public function getProduct(ConnectionInterface $db, int $tenantId, int $productId, ?int $variantId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $row = $this->one($db, "SELECT p.id,p.product_name,p.product_code,p.base_unit_id,p.selling_price,p.tax_rate,p.is_variant_product,COALESCE(pv.selling_price,p.selling_price) current_price,COALESCE(pv.unit_id,p.base_unit_id) current_unit_id,pv.id matched_variant_id,u.quantity_precision,u.is_fraction_allowed FROM PRODUCTS p JOIN BUSINESS_PROFILES bp ON bp.tenant_id=p.tenant_id AND bp.approval_status='APPROVED' AND bp.publication_status='PUBLISHED' AND bp.status='A' JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id=p.tenant_id AND ss.storefront_status='ACTIVE' AND (ss.accept_online_orders=1 OR ss.whatsapp_enabled=1) AND ss.status='A' LEFT JOIN PRODUCT_VARIANTS pv ON pv.id=:variant AND pv.product_id=p.id AND pv.tenant_id=p.tenant_id AND pv.variant_status='ACTIVE' AND pv.status='A' JOIN UNITS_OF_MEASURE u ON u.id=COALESCE(pv.unit_id,p.base_unit_id) AND u.status='A' WHERE p.id=:product AND p.tenant_id=:tenant AND p.product_status='ACTIVE' AND p.publication_status='PUBLISHED' AND p.status='A' LIMIT 1", [':variant'=>$variantId,':product'=>$productId,':tenant'=>$tenantId], 'getProduct');
        if ($row['status']==='SUCCESS' && $row['data']!==[] && $variantId!==null && (int)($row['data']['matched_variant_id']??0)!==$variantId) return $this->failed('Selected product variant is unavailable.');
        return $row;
    }
    public function getActiveCart(ConnectionInterface $db,int $userId,int $tenantId,bool $lock=false): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $sql="SELECT id,tenant_id,user_id,currency,cart_status FROM CARTS WHERE user_id=:user AND tenant_id=:tenant AND cart_status='ACTIVE' AND status='A' ORDER BY id DESC LIMIT 1";
        if($lock)$sql.=' FOR UPDATE';
        return $this->one($db,$sql,[':user'=>$userId,':tenant'=>$tenantId],'getActiveCart');
    }
    public function createCart(ConnectionInterface $db,int $userId,int $tenantId,string $currency): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try{$db->createCommand("INSERT INTO CARTS(tenant_id,user_id,cart_status,currency,last_activity_on,status,created_by,updated_by) VALUES(:tenant,:user,'ACTIVE',:currency,CURRENT_TIMESTAMP,'A',:user,:user)",[':tenant'=>$tenantId,':user'=>$userId,':currency'=>$currency])->execute();return $this->ok(['id'=>(int)$db->getLastInsertId()]);}
        catch(Throwable $e){return $this->error('createCart',$e);}
    }
    public function getItems(ConnectionInterface $db,int $cartId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try{$rows=$db->createCommand("SELECT ci.id,ci.product_id,ci.variant_id,ci.quantity,ci.unit_price_snapshot,p.product_name,p.product_code FROM CART_ITEMS ci JOIN PRODUCTS p ON p.id=ci.product_id AND p.tenant_id=ci.tenant_id WHERE ci.cart_id=:cart AND ci.status='A' ORDER BY ci.id",[':cart'=>$cartId])->queryAll();return $this->ok(is_array($rows)?$rows:[]);}
        catch(Throwable $e){return $this->error('getItems',$e);}
    }
    public function getItem(ConnectionInterface $db,int $cartId,int $itemId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db,"SELECT id,product_id,variant_id,quantity FROM CART_ITEMS WHERE cart_id=:cart AND id=:item AND status='A' LIMIT 1",[':cart'=>$cartId,':item'=>$itemId],'getItem');
    }
    public function findLine(ConnectionInterface $db,int $cartId,int $productId,?int $variantId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db,"SELECT id,quantity FROM CART_ITEMS WHERE cart_id=:cart AND product_id=:product AND variant_id <=> :variant AND status='A' LIMIT 1 FOR UPDATE",[':cart'=>$cartId,':product'=>$productId,':variant'=>$variantId],'findLine');
    }
    public function saveLine(ConnectionInterface $db,int $userId,int $tenantId,int $cartId,int $productId,?int $variantId,string $qty,string $price,?int $itemId=null): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            if($itemId!==null){$db->createCommand("UPDATE CART_ITEMS SET quantity=:qty,unit_price_snapshot=:price,updated_by=:user WHERE id=:id AND cart_id=:cart AND status='A'",[':qty'=>$qty,':price'=>$price,':user'=>$userId,':id'=>$itemId,':cart'=>$cartId])->execute();return $this->ok(['id'=>$itemId]);}
            $db->createCommand("INSERT INTO CART_ITEMS(tenant_id,cart_id,product_id,variant_id,quantity,unit_price_snapshot,status,created_by,updated_by) VALUES(:tenant,:cart,:product,:variant,:qty,:price,'A',:user,:user)",[':tenant'=>$tenantId,':cart'=>$cartId,':product'=>$productId,':variant'=>$variantId,':qty'=>$qty,':price'=>$price,':user'=>$userId])->execute();
            return $this->ok(['id'=>(int)$db->getLastInsertId()]);
        } catch(Throwable $e){return $this->error('saveLine',$e);}
    }
    public function removeLine(ConnectionInterface $db,int $userId,int $cartId,int $itemId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try{$db->createCommand("UPDATE CART_ITEMS SET status='Z',updated_by=:user WHERE id=:item AND cart_id=:cart AND status='A'",[':user'=>$userId,':item'=>$itemId,':cart'=>$cartId])->execute();return $this->ok(['id'=>$itemId]);}
        catch(Throwable $e){return $this->error('removeLine',$e);}
    }
    public function clear(ConnectionInterface $db,int $userId,int $cartId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try{$db->createCommand("UPDATE CART_ITEMS SET status='Z',updated_by=:user WHERE cart_id=:cart AND status='A'",[':user'=>$userId,':cart'=>$cartId])->execute();return $this->ok([]);}
        catch(Throwable $e){return $this->error('clear',$e);}
    }
    public function touch(ConnectionInterface $db,int $userId,int $cartId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try{$db->createCommand("UPDATE CARTS SET last_activity_on=CURRENT_TIMESTAMP,updated_by=:user WHERE id=:id AND status='A'",[':user'=>$userId,':id'=>$cartId])->execute();return $this->ok(['id'=>$cartId]);}
        catch(Throwable $e){return $this->error('touch',$e);}
    }

    public function getCustomerIdentity(ConnectionInterface $db, int $userId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM CUSTOMER_IDENTITIES WHERE user_id=:user AND status='A' LIMIT 1", [':user'=>$userId], 'getCustomerIdentity');
    }
    public function createCustomerIdentity(ConnectionInterface $db, int $userId, string $name, ?string $email, ?string $mobile): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO CUSTOMER_IDENTITIES(user_id,full_name,email,mobile,identity_status,status,created_by,updated_by) VALUES(:user,:name,:email,:mobile,'ACTIVE','A',:user,:user)", [':user'=>$userId,':name'=>$name,':email'=>$email,':mobile'=>$mobile])->execute();
            return $this->ok(['id'=>(int)$db->getLastInsertId()]);
        } catch(Throwable $e) { return $this->error('createCustomerIdentity',$e); }
    }
    public function getTenantCustomer(ConnectionInterface $db, int $tenantId, int $identityId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        return $this->one($db, "SELECT id FROM TENANT_CUSTOMERS WHERE tenant_id=:tenant AND customer_identity_id=:identity AND status='A' LIMIT 1", [':tenant'=>$tenantId,':identity'=>$identityId], 'getTenantCustomer');
    }
    public function createTenantCustomer(ConnectionInterface $db, int $userId, int $tenantId, int $identityId, string $name, ?string $email, ?string $mobile): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO TENANT_CUSTOMERS(tenant_id,customer_identity_id,customer_code,display_name,mobile,email,customer_type,credit_limit,opening_balance,customer_status,status,created_by,updated_by) VALUES(:tenant,:identity,:code,:name,:mobile,:email,'INDIVIDUAL',0,0,'ACTIVE','A',:user,:user)", [':tenant'=>$tenantId,':identity'=>$identityId,':code'=>'WEB-'.$userId,':name'=>$name,':mobile'=>$mobile,':email'=>$email,':user'=>$userId])->execute();
            return $this->ok(['id'=>(int)$db->getLastInsertId()]);
        } catch(Throwable $e) { return $this->error('createTenantCustomer',$e); }
    }
    public function createOrder(ConnectionInterface $db, int $userId, int $tenantId, int $customerId, string $number, string $orderedOn, string $subtotal, string $tax, string $grandTotal, ?string $notes, string $channel='MARKETPLACE', string $orderStatus='PLACED'): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO ORDERS(tenant_id,order_number,tenant_customer_id,order_channel,order_status,payment_status,fulfilment_status,ordered_on,subtotal,discount_amount,tax_amount,delivery_fee,grand_total,amount_paid,notes,created_by,status,updated_by) VALUES(:tenant,:number,:customer,:channel,:orderStatus,'UNPAID','UNFULFILLED',:ordered,:subtotal,0,:tax,0,:grand,0,:notes,:user,'A',:user)", [':tenant'=>$tenantId,':number'=>$number,':customer'=>$customerId,':channel'=>$channel,':orderStatus'=>$orderStatus,':ordered'=>$orderedOn,':subtotal'=>$subtotal,':tax'=>$tax,':grand'=>$grandTotal,':notes'=>$notes,':user'=>$userId])->execute();
            return $this->ok(['id'=>(int)$db->getLastInsertId()]);
        } catch(Throwable $e) { return $this->error('createOrder',$e); }
    }
    public function createOrderItem(ConnectionInterface $db, int $userId, int $tenantId, int $orderId, int $productId, ?int $variantId, string $name, string $code, int $unitId, string $quantity, string $unitPrice, string $taxRate, string $taxAmount, string $lineTotal): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO ORDER_ITEMS(tenant_id,order_id,product_id,variant_id,product_name_snapshot,product_code_snapshot,unit_id,quantity,unit_price,discount_amount,tax_rate,tax_amount,line_total,status,created_by,updated_by) VALUES(:tenant,:order,:product,:variant,:name,:code,:unit,:qty,:price,0,:rate,:tax,:total,'A',:user,:user)", [':tenant'=>$tenantId,':order'=>$orderId,':product'=>$productId,':variant'=>$variantId,':name'=>$name,':code'=>$code,':unit'=>$unitId,':qty'=>$quantity,':price'=>$unitPrice,':rate'=>$taxRate,':tax'=>$taxAmount,':total'=>$lineTotal,':user'=>$userId])->execute();
            return $this->ok([]);
        } catch(Throwable $e) { return $this->error('createOrderItem',$e); }
    }
    public function createOrderHistory(ConnectionInterface $db, int $userId, int $tenantId, int $orderId, string $newStatus, string $changedOn): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO ORDER_STATUS_HISTORY(tenant_id,order_id,old_status,new_status,changed_by,changed_on,status,created_by,updated_by) VALUES(:tenant,:order,NULL,:new,:user,:changed,'A',:user,:user)", [':tenant'=>$tenantId,':order'=>$orderId,':new'=>$newStatus,':user'=>$userId,':changed'=>$changedOn])->execute();
            return $this->ok([]);
        } catch(Throwable $e) { return $this->error('createOrderHistory',$e); }
    }
    public function createFulfilment(ConnectionInterface $db, int $userId, int $tenantId, int $orderId, string $recipientName, ?string $recipientMobile, string $addressSnapshot): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("INSERT INTO ORDER_FULFILMENTS(tenant_id,order_id,fulfilment_type,fulfilment_status,recipient_name,recipient_mobile,delivery_address_snapshot,status,created_by,updated_by) VALUES(:tenant,:order,'DELIVERY','PENDING',:name,:mobile,:address,'A',:user,:user)", [':tenant'=>$tenantId,':order'=>$orderId,':name'=>$recipientName,':mobile'=>$recipientMobile,':address'=>$addressSnapshot,':user'=>$userId])->execute();
            return $this->ok([]);
        } catch(Throwable $e) { return $this->error('createFulfilment',$e); }
    }
    public function convertCart(ConnectionInterface $db, int $userId, int $cartId): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        try {
            $db->createCommand("UPDATE CARTS SET cart_status='CONVERTED',converted_on=CURRENT_TIMESTAMP,updated_by=:user WHERE id=:id AND cart_status='ACTIVE' AND status='A'", [':user'=>$userId,':id'=>$cartId])->execute();
            return $this->ok(['id'=>$cartId]);
        } catch(Throwable $e) { return $this->error('convertCart',$e); }
    }
    private function one(ConnectionInterface $db,string $sql,array $params,string $op): array {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];try{$row=$db->createCommand($sql,$params)->queryOne();return $this->ok(is_array($row)?$row:[]);}catch(Throwable $e){return $this->error($op,$e);}}
    private function ok(array $data): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $resArr['status'] = 'SUCCESS';
        $resArr['data'] = $data;
        return $resArr;
    }
    private function failed(string $msg): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $resArr['msgArr'][] = $msg;
        return $resArr;
    }
    private function error(string $op, Throwable $e): array
    {
        $resArr = ['status' => 'FAILED', 'msgArr' => [], 'data' => []];
        $this->logger->error('CartDao::' . $op . ' failed.', ['exception' => $e]);
        $resArr['status'] = 'EXCEPTION';
        $resArr['msgArr'][] = 'Cart data operation failed.';
        return $resArr;
    }
}
