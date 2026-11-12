<?php
declare(strict_types=1);
namespace App\Modules\Api\V1\Controllers;
use App\Modules\Api\V1\Services\Implementations\OrderServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;
final class OrderController {
    public function actionGetOrders(ServerRequestInterface $request,OrderServicesV1 $services,ResponseFactoryInterface $responses,StreamFactoryInterface $streams): ResponseInterface {
        $body=$request->getParsedBody();$input=is_array($body)?$body:[];$param=is_array($input['orderParam']??null)?$input['orderParam']:[];
        $data=is_array($param['actionData']??null)?$param['actionData']:[];$auth=$request->getHeaderLine('Authorization');
        $data['_accessToken']=str_starts_with($auth,'Bearer ')?trim(substr($auth,7)):'';
        $param['actionData']=$data;$input['orderParam']=$param;
        try{$result=$services->getOrders($input);}catch(Throwable){$result=['status'=>'EXCEPTION','msgArr'=>['Order retrieval failed unexpectedly.'],'data'=>[]];}
        $state=$result['status']??'EXCEPTION';$http=$state==='SUCCESS'?200:($state==='FAILED'?400:500);
        try{$json=json_encode($result,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES);}catch(Throwable){$http=500;$json='{"status":"EXCEPTION","msgArr":["Unable to serialize API response."],"data":[]}';}
        return $responses->createResponse($http)->withHeader('Content-Type','application/json; charset=utf-8')->withBody($streams->createStream($json));
    }
}
