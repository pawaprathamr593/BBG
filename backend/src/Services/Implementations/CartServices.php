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
        $store=$this->dao->getEnabledStorefront($this->db,$tenant);if($store['status']!=='SUCCESS')return $store;if($store['data']===[])return $this->fail('Business storefront is not approved or has no enabled ordering channel.');
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
        if(!in_array($action,['addItem','updateItem','removeItem','clearCart','checkout','whatsappOrder'],true))return $this->fail('Unsupported cart management action.');
        $principal=$this->principal((string)($d['_accessToken']??''));if($principal['status']!=='SUCCESS')return $principal;
        $user=(int)$principal['data']['user_id'];$tenant=$this->tenantId($d['tenant_id']??null);if($tenant===null)return $this->fail('A valid tenant_id is required.');
        $tx=$this->db->beginTransaction();
        try {
            $store=$this->dao->getEnabledStorefront($this->db,$tenant);if($store['status']!=='SUCCESS'||$store['data']===[]){$tx->rollBack();return $store['status']==='SUCCESS'?$this->fail('Business storefront is not approved or has no enabled ordering channel.'):$store;}
            if($action==='checkout'&&(int)($store['data']['accept_online_orders']??0)!==1){$tx->rollBack();return $this->fail('Online checkout is not enabled for this storefront.');}
            $cart=$this->dao->getActiveCart($this->db,$user,$tenant,true);if($cart['status']!=='SUCCESS'){$tx->rollBack();return $cart;}
            $cartId=(int)($cart['data']['id']??0);
            if($cartId===0&&$action==='addItem'){$new=$this->dao->createCart($this->db,$user,$tenant,(string)($store['data']['default_currency']??'INR'));if($new['status']!=='SUCCESS'){$tx->rollBack();return $new;}$cartId=(int)$new['data']['id'];}
            if($cartId===0){$tx->rollBack();return $this->fail('Active cart was not found.');}
            if($action==='whatsappOrder'){
                if((int)($store['data']['whatsapp_enabled']??0)!==1){$tx->rollBack();return $this->fail('WhatsApp ordering is not enabled for this storefront.');}
                $result=$this->createWhatsAppOrder($d,$principal['data'],$user,$tenant,$cartId,$store['data']);
                if($result['status']!=='SUCCESS'){$tx->rollBack();return $result;}
                $tx->commit();return $result;
            }
            if($action==='checkout'){
                $shipping=$d['shipping_address']??null;
                if(!is_array($shipping)||trim((string)($shipping['address_line_1']??''))===''||trim((string)($shipping['city']??''))===''||trim((string)($shipping['state']??''))===''||trim((string)($shipping['postal_code']??''))===''){
                    $tx->rollBack();return $this->fail('Shipping address requires address_line_1, city, state and postal_code.');
                }
                $items=$this->dao->getItems($this->db,$cartId);
                if($items['status']!=='SUCCESS'||$items['data']===[]){$tx->rollBack();return $items['status']==='SUCCESS'?$this->fail('Cart is empty.'):$items;}
                $customerIdentity=$this->dao->getCustomerIdentity($this->db,$user);
                if($customerIdentity['status']!=='SUCCESS'){$tx->rollBack();return $customerIdentity;}
                if($customerIdentity['data']===[]){
                    $profile=$principal['data'];
                    $identity=$this->dao->createCustomerIdentity($this->db,$user,(string)($profile['full_name']??'Customer'),isset($profile['email'])?(string)$profile['email']:null,isset($profile['mobile'])?(string)$profile['mobile']:null);
                    if($identity['status']!=='SUCCESS'){$tx->rollBack();return $identity;}
                    $identityId=(int)$identity['data']['id'];
                }else{$identityId=(int)$customerIdentity['data']['id'];}
                $tenantCustomer=$this->dao->getTenantCustomer($this->db,$tenant,$identityId);
                if($tenantCustomer['status']!=='SUCCESS'){$tx->rollBack();return $tenantCustomer;}
                if($tenantCustomer['data']===[]){
                    $profile=$principal['data'];
                    $createdCustomer=$this->dao->createTenantCustomer($this->db,$user,$tenant,$identityId,(string)($profile['full_name']??'Customer'),isset($profile['email'])?(string)$profile['email']:null,isset($profile['mobile'])?(string)$profile['mobile']:null);
                    if($createdCustomer['status']!=='SUCCESS'){$tx->rollBack();return $createdCustomer;}
                    $tenantCustomerId=(int)$createdCustomer['data']['id'];
                }else{$tenantCustomerId=(int)$tenantCustomer['data']['id'];}
                $subtotal=0.0;$taxTotal=0.0;$orderLines=[];
                foreach($items['data'] as $item){
                    $variantId=$item['variant_id']===null?null:(int)$item['variant_id'];
                    $product=$this->dao->getProduct($this->db,$tenant,(int)$item['product_id'],$variantId);
                    if($product['status']!=='SUCCESS'||$product['data']===[]){$tx->rollBack();return $this->fail('A cart product is no longer available for ordering.');}
                    $qty=(string)$item['quantity'];
                    // CART_ITEMS stores three decimal places; ignore trailing zeros
                    // before enforcing the two-decimal ORDER_ITEMS precision.
                    if(str_contains($qty,'.')){$qty=rtrim(rtrim($qty,'0'),'.');}
                    if(preg_match('/^\\d+\\.\\d{3,}$/D',$qty)===1){$tx->rollBack();return $this->fail('Order quantities support at most two decimal places in the current order schema.');}
                    $unitPrice=(float)$product['data']['current_price'];$rate=(float)$product['data']['tax_rate'];
                    $base=round((float)$qty*$unitPrice,2);$tax=round($base*$rate/100,2);$line=round($base+$tax,2);
                    $subtotal+=$base;$taxTotal+=$tax;
                    $orderLines[]=['item'=>$item,'product'=>$product['data'],'quantity'=>$qty,'unit_price'=>number_format($unitPrice,2,'.',''),'tax_rate'=>number_format($rate,2,'.',''),'tax_amount'=>number_format($tax,2,'.',''),'line_total'=>number_format($line,2,'.','')];
                }
                $subtotal=round($subtotal,2);$taxTotal=round($taxTotal,2);$grand=round($subtotal+$taxTotal,2);
                $orderedOn=gmdate('Y-m-d H:i:s');$orderNumber='BBG-'.$tenant.'-'.gmdate('ymdHis').'-'.strtoupper(bin2hex(random_bytes(3)));
                $order=$this->dao->createOrder($this->db,$user,$tenant,$tenantCustomerId,$orderNumber,$orderedOn,number_format($subtotal,2,'.',''),number_format($taxTotal,2,'.',''),number_format($grand,2,'.',''),isset($d['notes'])?substr(trim((string)$d['notes']),0,1000):null);
                if($order['status']!=='SUCCESS'){$tx->rollBack();return $order;}
                $orderId=(int)$order['data']['id'];
                foreach($orderLines as $line){
                    $item=$line['item'];$product=$line['product'];
                    $saved=$this->dao->createOrderItem($this->db,$user,$tenant,$orderId,(int)$item['product_id'],$item['variant_id']===null?null:(int)$item['variant_id'],(string)$product['product_name'],(string)$product['product_code'],(int)($product['current_unit_id']??$product['base_unit_id']),$line['quantity'],$line['unit_price'],$line['tax_rate'],$line['tax_amount'],$line['line_total']);
                    if($saved['status']!=='SUCCESS'){$tx->rollBack();return $saved;}
                }
                $history=$this->dao->createOrderHistory($this->db,$user,$tenant,$orderId,'PLACED',$orderedOn);
                if($history['status']!=='SUCCESS'){$tx->rollBack();return $history;}
                $recipientName=trim((string)($shipping['recipient_name']??$principal['data']['full_name']??'Customer'));
                $recipientMobile=isset($shipping['mobile'])?substr(trim((string)$shipping['mobile']),0,25):($principal['data']['mobile']??null);
                $addressSnapshot=json_encode(['address_line_1'=>trim((string)$shipping['address_line_1']),'address_line_2'=>trim((string)($shipping['address_line_2']??'')),'city'=>trim((string)$shipping['city']),'state'=>trim((string)$shipping['state']),'postal_code'=>trim((string)$shipping['postal_code']),'country_code'=>strtoupper(substr((string)($shipping['country_code']??'IN'),0,2))],JSON_THROW_ON_ERROR);
                $fulfilment=$this->dao->createFulfilment($this->db,$user,$tenant,$orderId,$recipientName,$recipientMobile,$addressSnapshot);
                if($fulfilment['status']!=='SUCCESS'){$tx->rollBack();return $fulfilment;}
                $converted=$this->dao->convertCart($this->db,$user,$cartId);
                if($converted['status']!=='SUCCESS'){$tx->rollBack();return $converted;}
                $tx->commit();
                return $this->ok(['order_id'=>$orderId,'order_number'=>$orderNumber,'order_status'=>'PLACED','payment_status'=>'UNPAID','subtotal'=>number_format($subtotal,2,'.',''),'tax_amount'=>number_format($taxTotal,2,'.',''),'grand_total'=>number_format($grand,2,'.','')]);
            }
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
    private function createWhatsAppOrder(array $d,array $profile,int $user,int $tenant,int $cartId,array $store): array {
        $phone=preg_replace('/\\D+/','',(string)($store['whatsapp_number']??''));
        if($phone===''||strlen($phone)<8)return $this->fail('The business WhatsApp number is not configured correctly.');
        $items=$this->dao->getItems($this->db,$cartId);
        if($items['status']!=='SUCCESS'||$items['data']===[])return $items['status']==='SUCCESS'?$this->fail('Cart is empty.'):$items;
        $identity=$this->dao->getCustomerIdentity($this->db,$user);
        if($identity['status']!=='SUCCESS')return $identity;
        if($identity['data']===[]){
            $created=$this->dao->createCustomerIdentity($this->db,$user,(string)($profile['full_name']??'Customer'),isset($profile['email'])?(string)$profile['email']:null,isset($profile['mobile'])?(string)$profile['mobile']:null);
            if($created['status']!=='SUCCESS')return $created;
            $identityId=(int)$created['data']['id'];
        }else{$identityId=(int)$identity['data']['id'];}
        $customer=$this->dao->getTenantCustomer($this->db,$tenant,$identityId);
        if($customer['status']!=='SUCCESS')return $customer;
        if($customer['data']===[]){
            $created=$this->dao->createTenantCustomer($this->db,$user,$tenant,$identityId,(string)($profile['full_name']??'Customer'),isset($profile['email'])?(string)$profile['email']:null,isset($profile['mobile'])?(string)$profile['mobile']:null);
            if($created['status']!=='SUCCESS')return $created;
            $customerId=(int)$created['data']['id'];
        }else{$customerId=(int)$customer['data']['id'];}
        $subtotal=0.0;$taxTotal=0.0;$lines=[];
        foreach($items['data'] as $item){
            $variantId=$item['variant_id']===null?null:(int)$item['variant_id'];
            $product=$this->dao->getProduct($this->db,$tenant,(int)$item['product_id'],$variantId);
            if($product['status']!=='SUCCESS'||$product['data']===[])return $this->fail('A cart product is no longer available for ordering.');
            $qty=(string)$item['quantity'];if(str_contains($qty,'.'))$qty=rtrim(rtrim($qty,'0'),'.');
            if(preg_match('/^\\d+\\.\\d{3,}$/D',$qty)===1)return $this->fail('Order quantities support at most two decimal places in the current order schema.');
            $price=(float)$product['data']['current_price'];$rate=(float)$product['data']['tax_rate'];
            $base=round((float)$qty*$price,2);$tax=round($base*$rate/100,2);$line=round($base+$tax,2);
            $subtotal+=$base;$taxTotal+=$tax;
            $lines[]=['item'=>$item,'product'=>$product['data'],'quantity'=>$qty,'price'=>number_format($price,2,'.',''),'rate'=>number_format($rate,2,'.',''),'tax'=>number_format($tax,2,'.',''),'total'=>number_format($line,2,'.','')];
        }
        $subtotal=round($subtotal,2);$taxTotal=round($taxTotal,2);$grand=round($subtotal+$taxTotal,2);
        $orderedOn=gmdate('Y-m-d H:i:s');$number='BBG-'.$tenant.'-'.gmdate('ymdHis').'-'.strtoupper(bin2hex(random_bytes(3)));
        $notes=isset($d['notes'])?substr(trim((string)$d['notes']),0,1000):null;
        $order=$this->dao->createOrder($this->db,$user,$tenant,$customerId,$number,$orderedOn,number_format($subtotal,2,'.',''),number_format($taxTotal,2,'.',''),number_format($grand,2,'.',''),$notes,'WHATSAPP','REQUESTED');
        if($order['status']!=='SUCCESS')return $order;
        $orderId=(int)$order['data']['id'];
        foreach($lines as $line){
            $item=$line['item'];$product=$line['product'];
            $saved=$this->dao->createOrderItem($this->db,$user,$tenant,$orderId,(int)$item['product_id'],$item['variant_id']===null?null:(int)$item['variant_id'],(string)$product['product_name'],(string)$product['product_code'],(int)($product['current_unit_id']??$product['base_unit_id']),$line['quantity'],$line['price'],$line['rate'],$line['tax'],$line['total']);
            if($saved['status']!=='SUCCESS')return $saved;
        }
        $history=$this->dao->createOrderHistory($this->db,$user,$tenant,$orderId,'REQUESTED',$orderedOn);
        if($history['status']!=='SUCCESS')return $history;
        $converted=$this->dao->convertCart($this->db,$user,$cartId);
        if($converted['status']!=='SUCCESS')return $converted;
        $message="Hello, I would like to place order ".$number."\\n";
        foreach($lines as $line)$message.=$line['product']['product_name']." x ".$line['quantity']." - ".$line['total']."\\n";
        $message.="Total: ".number_format($grand,2,'.','')."\\nPlease confirm availability and next steps.";
        return $this->ok(['order_id'=>$orderId,'order_number'=>$number,'order_channel'=>'WHATSAPP','order_status'=>'REQUESTED','payment_status'=>'UNPAID','subtotal'=>number_format($subtotal,2,'.',''),'tax_amount'=>number_format($taxTotal,2,'.',''),'grand_total'=>number_format($grand,2,'.',''),'whatsapp_url'=>'https://wa.me/'.$phone.'?text='.rawurlencode($message),'whatsapp_handoff'=>'NOT_CONFIRMED']);
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
