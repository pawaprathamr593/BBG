<?php
declare(strict_types=1);
namespace App\Services\Implementations;
use App\Dao\CartDao;
use App\Services\Interfaces\ICartServices;
use App\Services\Interfaces\IAuthServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;
final readonly class CartServices implements ICartServices {
    public function __construct(private ConnectionInterface $db,private CartDao $dao,private IAuthServices $auth,private LoggerInterface $logger) {}
    public function getCart(array $param): array {
        if(($bad=$this->envelope($param,'getCart'))!==null)return $bad;
        if(($param['actionType']??'')!=='getCart'||($param['actionData']['action']??'')!=='getCart')return $this->fail('Unsupported cart read action.');
        $principal=$this->principal((string)($param['actionData']['_accessToken']??''));if($principal['status']!=='SUCCESS')return $principal;
        $tenant=$this->tenantId($param['actionData']['tenant_id']??null);if($tenant===null)return $this->fail('A valid tenant_id is required.');
        $store=$this->dao->getApprovedStorefront($this->db,$tenant);if($store['status']!=='SUCCESS')return $store;if($store['data']===[])return $this->fail('Business storefront is not approved or is not accepting online orders.');
        $cart=$this->dao->getActiveCart($this->db,(int)$principal['data']['user_id'],$tenant);if($cart['status']!=='SUCCESS')return $cart;
        if($cart['data']===[])return $this->ok(['cart'=>null,'items'=>[],'subtotal'=>'0.00']);
        $items=$this->dao->getItems($this->db,(int)$cart['data']['id']);if($items['status']!=='SUCCESS')return $items;
        $sum=0.0;foreach($items['data'] as &$item){$line=(float)$item['quantity']*(float)$item['unit_price_snapshot'];$item['line_total']=number_format($line,2,'.','');$sum+=$line;}unset($item);
        return $this->ok(['cart'=>$cart['data'],'items'=>$items['data'],'subtotal'=>number_format($sum,2,'.','')]);
    }
    public function manageCart(array $param): array {
        if(($bad=$this->envelope($param,'manageCart'))!==null)return $bad;
        if(($param['actionType']??'')!=='manageCart')return $this->fail('Unsupported actionType for manageCart.');
        $d=$param['actionData'];$action=(string)($d['action']??'');
        if(!in_array($action,['addItem','updateItem','removeItem','clearCart'],true))return $this->fail('Unsupported cart management action.');
        $principal=$this->principal((string)($d['_accessToken']??''));if($principal['status']!=='SUCCESS')return $principal;
        $user=(int)$principal['data']['user_id'];$tenant=$this->tenantId($d['tenant_id']??null);if($tenant===null)return $this->fail('A valid tenant_id is required.');
        $tx=$this->db->beginTransaction();
        try {
            $store=$this->dao->getApprovedStorefront($this->db,$tenant);if($store['status']!=='SUCCESS'||$store['data']===[]){$tx->rollBack();return $store['status']==='SUCCESS'?$this->fail('Business storefront is not approved or is not accepting online orders.'):$store;}
            $cart=$this->dao->getActiveCart($this->db,$user,$tenant,true);if($cart['status']!=='SUCCESS'){$tx->rollBack();return $cart;}
            $cartId=(int)($cart['data']['id']??0);
            if($cartId===0&&$action!=='removeItem'&&$action!=='clearCart'){$new=$this->dao->createCart($this->db,$user,$tenant,(string)($store['data']['default_currency']??'INR'));if($new['status']!=='SUCCESS'){$tx->rollBack();return $new;}$cartId=(int)$new['data']['id'];}
            if($cartId===0){$tx->rollBack();return $this->fail('Active cart was not found.');}
            if($action==='addItem'){
                $product=$this->positiveInt($d['product_id']??null);$variant=isset($d['variant_id'])&&$d['variant_id']!==''?$this->positiveInt($d['variant_id']):null;$qty=$this->quantity($d['quantity']??null);
                if($product===null||((isset($d['variant_id'])&&$d['variant_id']!=='')&&$variant===null)||$qty===null){$tx->rollBack();return $this->fail('Valid product_id, optional variant_id and positive quantity are required.');}
                $p=$this->dao->getProduct($this->db,$tenant,$product,$variant);if($p['status']!=='SUCCESS'||$p['data']===[]){$tx->rollBack();return $p['status']==='SUCCESS'?$this->fail('Product is not available for online ordering.'):$p;}
                if(!empty($p['data']['is_variant_product'])&&$variant===null){$tx->rollBack();return $this->fail('A variant must be selected for this product.');}
                if(!$this->precisionOk($qty,(int)$p['data']['quantity_precision'],(bool)$p['data']['is_fraction_allowed'])){$tx->rollBack();return $this->fail('Quantity does not match product unit precision.');}
                $line=$this->dao->findLine($this->db,$cartId,$product,$variant);if($line['status']!=='SUCCESS'){$tx->rollBack();return $line;}
                if($line['data']!==[]){$qty=$this->fmt((float)$line['data']['quantity']+(float)$qty);if((float)$qty>1000000||!$this->precisionOk($qty,(int)$p['data']['quantity_precision'],(bool)$p['data']['is_fraction_allowed'])){$tx->rollBack();return $this->fail('Combined cart quantity exceeds allowed precision or maximum.');}$saved=$this->dao->saveLine($this->db,$user,$tenant,$cartId,$product,$variant,$qty,(string)$p['data']['current_price'],(int)$line['data']['id']);}
                else{$saved=$this->dao->saveLine($this->db,$user,$tenant,$cartId,$product,$variant,$qty,(string)$p['data']['current_price']);}
            } elseif($action==='updateItem'){
                $itemId=$this->positiveInt($d['item_id']??null);$qty=$this->quantity($d['quantity']??null);if($itemId===null||$qty===null){$tx->rollBack();return $this->fail('Valid item_id and positive quantity are required.');}
                $line=$this->dao->getItem($this->db,$cartId,$itemId);if($line['status']!=='SUCCESS'||$line['data']===[]){$tx->rollBack();return $this->fail('Cart item was not found.');}
                $p=$this->dao->getProduct($this->db,$tenant,(int)$line['data']['product_id'],$line['data']['variant_id']===null?null:(int)$line['data']['variant_id']);if($p['status']!=='SUCCESS'||$p['data']===[]){$tx->rollBack();return $this->fail('Product is no longer available for online ordering.');}
                if(!$this->precisionOk($qty,(int)$p['data']['quantity_precision'],(bool)$p['data']['is_fraction_allowed'])){$tx->rollBack();return $this->fail('Quantity does not match product unit precision.');}
                $saved=$this->dao->saveLine($this->db,$user,$tenant,$cartId,(int)$line['data']['product_id'],$line['data']['variant_id']===null?null:(int)$line['data']['variant_id'],$qty,(string)$p['data']['current_price'],$itemId);
            } elseif($action==='removeItem'){
                $itemId=$this->positiveInt($d['item_id']??null);if($itemId===null){$tx->rollBack();return $this->fail('Valid item_id is required.');}
                $line=$this->dao->getItem($this->db,$cartId,$itemId);if($line['status']!=='SUCCESS'||$line['data']===[]){$tx->rollBack();return $this->fail('Cart item was not found.');}
                $saved=$this->dao->removeLine($this->db,$user,$cartId,$itemId);
            } else {$saved=$this->dao->clear($this->db,$user,$cartId);}
            if($saved['status']!=='SUCCESS'){$tx->rollBack();return $saved;}
            $touch=$this->dao->touch($this->db,$user,$cartId);if($touch['status']!=='SUCCESS'){$tx->rollBack();return $touch;}
            $tx->commit();return $this->ok(['cart_id'=>$cartId]);
        } catch(Throwable $e){if($tx->isActive())$tx->rollBack();$this->logger->error('CartServices::manageCart failed.',['exception'=>$e]);return ['status'=>'EXCEPTION','msgArr'=>['Cart operation failed unexpectedly.'],'data'=>[]];}
    }
    private function principal(string $token): array {return $this->auth->getAuth(['actionType'=>'getAuth','actionData'=>['action'=>'getProfile','_accessToken'=>$token]]);}
    private function envelope(array $p,string $name): ?array {return isset($p['actionType'],$p['actionData'])&&is_array($p['actionData'])?null:$this->fail('Invalid '.$name.' request envelope.');}
    private function tenantId(mixed $v): ?int {$n=$this->positiveInt($v);return $n;}
    private function positiveInt(mixed $v): ?int {$n=filter_var($v,FILTER_VALIDATE_INT);return $n!==false&&$n>0?(int)$n:null;}
    private function quantity(mixed $v): ?string {if(!is_scalar($v))return null;$raw=trim((string)$v);if(!preg_match('/^\\d+(?:\\.\\d{1,3})?$/D',$raw))return null;$number=(float)$raw;return $number>0&&$number<=1000000?$this->fmt($number):null;}
    private function fmt(float $v): string {return rtrim(rtrim(number_format($v,3,'.',''),'0'),'.')?:'0';}
    private function precisionOk(string $q,int $p,bool $fraction): bool {if(!$fraction&&floor((float)$q)!==(float)$q)return false;$parts=explode('.',$q);return strlen($parts[1]??'')<=min(3,max(0,$p));}
    private function ok(array $d): array{return ['status'=>'SUCCESS','msgArr'=>[],'data'=>$d];}
    private function fail(string $m): array{return ['status'=>'FAILED','msgArr'=>[$m],'data'=>[]];}
}
