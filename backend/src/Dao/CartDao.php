<?php
declare(strict_types=1);
namespace App\Dao;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;
final readonly class CartDao {
    public function __construct(private LoggerInterface $logger) {}
    public function getApprovedStorefront(ConnectionInterface $db, int $tenantId): array {
        return $this->one($db, "SELECT bp.id, t.default_currency FROM BUSINESS_PROFILES bp JOIN TENANTS t ON t.id=bp.tenant_id AND t.status='A' JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id=bp.tenant_id AND ss.status='A' WHERE bp.tenant_id=:tenant AND bp.approval_status='APPROVED' AND bp.publication_status='PUBLISHED' AND bp.status='A' AND t.tenant_status='ACTIVE' AND ss.storefront_status='ACTIVE' AND ss.accept_online_orders=1 LIMIT 1", [':tenant'=>$tenantId], 'getApprovedStorefront');
    }
    public function getProduct(ConnectionInterface $db, int $tenantId, int $productId, ?int $variantId): array {
        $row = $this->one($db, "SELECT p.id,p.product_name,p.product_code,p.base_unit_id,p.selling_price,p.tax_rate,p.is_variant_product,COALESCE(pv.selling_price,p.selling_price) current_price,pv.id matched_variant_id,u.quantity_precision,u.is_fraction_allowed FROM PRODUCTS p JOIN BUSINESS_PROFILES bp ON bp.tenant_id=p.tenant_id AND bp.approval_status='APPROVED' AND bp.publication_status='PUBLISHED' AND bp.status='A' JOIN STOREFRONT_SETTINGS ss ON ss.tenant_id=p.tenant_id AND ss.storefront_status='ACTIVE' AND ss.accept_online_orders=1 AND ss.status='A' LEFT JOIN PRODUCT_VARIANTS pv ON pv.id=:variant AND pv.product_id=p.id AND pv.tenant_id=p.tenant_id AND pv.variant_status='ACTIVE' AND pv.status='A' JOIN UNITS_OF_MEASURE u ON u.id=COALESCE(pv.unit_id,p.base_unit_id) AND u.status='A' WHERE p.id=:product AND p.tenant_id=:tenant AND p.product_status='ACTIVE' AND p.publication_status='PUBLISHED' AND p.status='A' LIMIT 1", [':variant'=>$variantId,':product'=>$productId,':tenant'=>$tenantId], 'getProduct');
        if ($row['status']==='SUCCESS' && $row['data']!==[] && $variantId!==null && (int)($row['data']['matched_variant_id']??0)!==$variantId) return $this->failed('Selected product variant is unavailable.');
        return $row;
    }
    public function getActiveCart(ConnectionInterface $db,int $userId,int $tenantId,bool $lock=false): array {
        $sql="SELECT id,tenant_id,user_id,currency,cart_status FROM CARTS WHERE user_id=:user AND tenant_id=:tenant AND cart_status='ACTIVE' AND status='A' ORDER BY id DESC LIMIT 1";
        if($lock)$sql.=' FOR UPDATE';
        return $this->one($db,$sql,[':user'=>$userId,':tenant'=>$tenantId],'getActiveCart');
    }
    public function createCart(ConnectionInterface $db,int $userId,int $tenantId,string $currency): array {
        try{$db->createCommand("INSERT INTO CARTS(tenant_id,user_id,cart_status,currency,last_activity_on,status,created_by,updated_by) VALUES(:tenant,:user,'ACTIVE',:currency,CURRENT_TIMESTAMP,'A',:user,:user)",[':tenant'=>$tenantId,':user'=>$userId,':currency'=>$currency])->execute();return $this->ok(['id'=>(int)$db->getLastInsertId()]);}
        catch(Throwable $e){return $this->error('createCart',$e);}
    }
    public function getItems(ConnectionInterface $db,int $cartId): array {
        try{$rows=$db->createCommand("SELECT ci.id,ci.product_id,ci.variant_id,ci.quantity,ci.unit_price_snapshot,p.product_name,p.product_code FROM CART_ITEMS ci JOIN PRODUCTS p ON p.id=ci.product_id AND p.tenant_id=ci.tenant_id WHERE ci.cart_id=:cart AND ci.status='A' ORDER BY ci.id",[':cart'=>$cartId])->queryAll();return $this->ok(is_array($rows)?$rows:[]);}
        catch(Throwable $e){return $this->error('getItems',$e);}
    }
    public function getItem(ConnectionInterface $db,int $cartId,int $itemId): array {
        return $this->one($db,"SELECT id,product_id,variant_id,quantity FROM CART_ITEMS WHERE cart_id=:cart AND id=:item AND status='A' LIMIT 1",[':cart'=>$cartId,':item'=>$itemId],'getItem');
    }
    public function findLine(ConnectionInterface $db,int $cartId,int $productId,?int $variantId): array {
        return $this->one($db,"SELECT id,quantity FROM CART_ITEMS WHERE cart_id=:cart AND product_id=:product AND variant_id <=> :variant AND status='A' LIMIT 1 FOR UPDATE",[':cart'=>$cartId,':product'=>$productId,':variant'=>$variantId],'findLine');
    }
    public function saveLine(ConnectionInterface $db,int $userId,int $tenantId,int $cartId,int $productId,?int $variantId,string $qty,string $price,?int $itemId=null): array {
        try {
            if($itemId!==null){$db->createCommand("UPDATE CART_ITEMS SET quantity=:qty,unit_price_snapshot=:price,updated_by=:user WHERE id=:id AND cart_id=:cart AND status='A'",[':qty'=>$qty,':price'=>$price,':user'=>$userId,':id'=>$itemId,':cart'=>$cartId])->execute();return $this->ok(['id'=>$itemId]);}
            $db->createCommand("INSERT INTO CART_ITEMS(tenant_id,cart_id,product_id,variant_id,quantity,unit_price_snapshot,status,created_by,updated_by) VALUES(:tenant,:cart,:product,:variant,:qty,:price,'A',:user,:user)",[':tenant'=>$tenantId,':cart'=>$cartId,':product'=>$productId,':variant'=>$variantId,':qty'=>$qty,':price'=>$price,':user'=>$userId])->execute();
            return $this->ok(['id'=>(int)$db->getLastInsertId()]);
        } catch(Throwable $e){return $this->error('saveLine',$e);}
    }
    public function removeLine(ConnectionInterface $db,int $userId,int $cartId,int $itemId): array {
        try{$db->createCommand("UPDATE CART_ITEMS SET status='Z',updated_by=:user WHERE id=:item AND cart_id=:cart AND status='A'",[':user'=>$userId,':item'=>$itemId,':cart'=>$cartId])->execute();return $this->ok(['id'=>$itemId]);}
        catch(Throwable $e){return $this->error('removeLine',$e);}
    }
    public function clear(ConnectionInterface $db,int $userId,int $cartId): array {
        try{$db->createCommand("UPDATE CART_ITEMS SET status='Z',updated_by=:user WHERE cart_id=:cart AND status='A'",[':user'=>$userId,':cart'=>$cartId])->execute();return $this->ok([]);}
        catch(Throwable $e){return $this->error('clear',$e);}
    }
    public function touch(ConnectionInterface $db,int $userId,int $cartId): array {
        try{$db->createCommand("UPDATE CARTS SET last_activity_on=CURRENT_TIMESTAMP,updated_by=:user WHERE id=:id AND status='A'",[':user'=>$userId,':id'=>$cartId])->execute();return $this->ok(['id'=>$cartId]);}
        catch(Throwable $e){return $this->error('touch',$e);}
    }
    private function one(ConnectionInterface $db,string $sql,array $params,string $op): array {try{$row=$db->createCommand($sql,$params)->queryOne();return $this->ok(is_array($row)?$row:[]);}catch(Throwable $e){return $this->error($op,$e);}}
    private function ok(array $data): array{return ['status'=>'SUCCESS','msgArr'=>[],'data'=>$data];}
    private function failed(string $msg): array{return ['status'=>'FAILED','msgArr'=>[$msg],'data'=>[]];}
    private function error(string $op,Throwable $e): array{$this->logger->error('CartDao::'.$op.' failed.',['exception'=>$e]);return ['status'=>'EXCEPTION','msgArr'=>['Cart data operation failed.'],'data'=>[]];}
}
