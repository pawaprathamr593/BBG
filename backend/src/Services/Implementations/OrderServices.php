<?php
declare(strict_types=1);
namespace App\Services\Implementations;
use App\Dao\OrderDao;
use App\Services\Interfaces\IOrderServices;
use App\Services\Interfaces\IAuthServices;
use Psr\Log\LoggerInterface;
use Throwable;
use Yiisoft\Db\Connection\ConnectionInterface;
final readonly class OrderServices implements IOrderServices {
    public function __construct(private ConnectionInterface $db,private OrderDao $dao,private IAuthServices $auth,private LoggerInterface $logger) {}
    public function getOrders(array $param): array {
        if(!isset($param['actionType'],$param['actionData'])||!is_array($param['actionData']))return $this->fail('Invalid order request envelope.');
        if($param['actionType']!=='getOrders')return $this->fail('Unsupported actionType for getOrders.');
        $d=$param['actionData'];$action=(string)($d['action']??'');
        $principal=$this->auth->getAuth(['actionType'=>'getAuth','actionData'=>['action'=>'getProfile','_accessToken'=>(string)($d['_accessToken']??'')]]);
        if($principal['status']!=='SUCCESS')return $principal;
        $user=(int)$principal['data']['user_id'];
        $tenant=null;if(isset($d['tenant_id'])&&$d['tenant_id']!==''){$tenant=filter_var($d['tenant_id'],FILTER_VALIDATE_INT);if($tenant===false||$tenant<1)return $this->fail('Invalid tenant_id.');$tenant=(int)$tenant;}
        if($action==='listMyOrders'){
            $page=max(1,(int)($d['page']??1));$size=min(50,max(1,(int)($d['page_size']??20)));$offset=($page-1)*$size;
            $rows=$this->dao->getCustomerOrders($this->db,$user,$tenant,$size,$offset);if($rows['status']!=='SUCCESS')return $rows;
            $count=$this->dao->countCustomerOrders($this->db,$user,$tenant);if($count['status']!=='SUCCESS')return $count;
            return $this->ok(['items'=>$rows['data'],'pagination'=>['page'=>$page,'page_size'=>$size,'total'=>(int)($count['data']['total']??0)]]);
        }
        if($action==='getMyOrder'){
            $orderId=filter_var($d['order_id']??null,FILTER_VALIDATE_INT);if($orderId===false||$orderId<1)return $this->fail('A valid order_id is required.');
            $order=$this->dao->getCustomerOrder($this->db,$user,(int)$orderId);if($order['status']!=='SUCCESS')return $order;if($order['data']===[])return $this->fail('Order was not found.');
            $tenantId=(int)$order['data']['tenant_id'];
            $items=$this->dao->getOrderItems($this->db,$tenantId,(int)$orderId);if($items['status']!=='SUCCESS')return $items;
            $history=$this->dao->getOrderHistory($this->db,$tenantId,(int)$orderId);if($history['status']!=='SUCCESS')return $history;
            $fulfilments=$this->dao->getOrderFulfilments($this->db,$tenantId,(int)$orderId);if($fulfilments['status']!=='SUCCESS')return $fulfilments;
            return $this->ok(['order'=>$order['data'],'items'=>$items['data'],'status_history'=>$history['data'],'fulfilments'=>$fulfilments['data']]);
        }
        return $this->fail('Unsupported order read action.');
    }
    private function ok(array $data): array{return ['status'=>'SUCCESS','msgArr'=>[],'data'=>$data];}
    private function fail(string $message): array{return ['status'=>'FAILED','msgArr'=>[$message],'data'=>[]];}
}
