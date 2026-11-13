<?php
declare(strict_types=1);
namespace App\Modules\Api\V1\Controllers;
use App\Modules\Api\V1\Services\Implementations\CartServicesV1;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;
final class CartController {
    public function actionGetCart(ServerRequestInterface $request, CartServicesV1 $services, ResponseFactoryInterface $responses, StreamFactoryInterface $streams): ResponseInterface { return $this->run($request, $services, $responses, $streams, false); }
    public function actionManageCart(ServerRequestInterface $request, CartServicesV1 $services, ResponseFactoryInterface $responses, StreamFactoryInterface $streams): ResponseInterface { return $this->run($request, $services, $responses, $streams, true); }
    private function run(ServerRequestInterface $request, CartServicesV1 $services, ResponseFactoryInterface $responses, StreamFactoryInterface $streams, bool $manage): ResponseInterface {
        $body = $request->getParsedBody(); $input = is_array($body) ? $body : [];
        $param = is_array($input['cartParam'] ?? null) ? $input['cartParam'] : [];
        $data = is_array($param['actionData'] ?? null) ? $param['actionData'] : [];
        $routeActions = [
            '/api/v1/cart/get' => 'getCart',
            '/api/v1/cart/add' => 'addItem',
            '/api/v1/cart/update' => 'updateItem',
            '/api/v1/cart/remove' => 'removeItem',
            '/api/v1/cart/clear' => 'clearCart',
            '/api/v1/cart/checkout' => 'checkout',
            '/api/v1/cart/whatsapp-order' => 'whatsappOrder',
        ];
        $action = $routeActions[$request->getUri()->getPath()] ?? '';
        if ($action === '') {
            return $this->respond(['status' => 'FAILED', 'msgArr' => ['Unsupported cart route.'], 'data' => []], $responses, $streams);
        }
        $param['actionType'] = $action;
        $data['action'] = $action;
        $header = $request->getHeaderLine('Authorization');
        $data['_accessToken'] = str_starts_with($header, 'Bearer ') ? trim(substr($header, 7)) : '';
        $param['actionData'] = $data; $input['cartParam'] = $param;
        try { $result = $manage ? $services->manageCart($input) : $services->getCart($input); }
        catch (Throwable) { $result = ['status'=>'EXCEPTION','msgArr'=>['Cart operation failed unexpectedly.'],'data'=>[]]; }
        $status = $result['status'] ?? 'EXCEPTION'; $http = $status === 'SUCCESS' ? 200 : ($status === 'FAILED' ? 400 : 500);
        try { $json = json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES); }
        catch (Throwable) { $http = 500; $json = '{"status":"EXCEPTION","msgArr":["Unable to serialize API response."],"data":[]}'; }
        return $responses->createResponse($http)->withHeader('Content-Type','application/json; charset=utf-8')->withBody($streams->createStream($json));
    }
}
