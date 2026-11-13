<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\AuthServicesV1;
use App\Utils\AuthTokenService;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class AuthController
{
    public function actionManageAuth(
        ServerRequestInterface $request,
        AuthServicesV1 $authServicesV1,
        AuthTokenService $tokenService,
        ResponseFactoryInterface $responseFactory,
        StreamFactoryInterface $streamFactory,
    ): ResponseInterface {
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $authParam = is_array($input['authParam'] ?? null) ? $input['authParam'] : [];
        $actionData = is_array($authParam['actionData'] ?? null) ? $authParam['actionData'] : [];
        $routeActions = [
            '/api/v1/auth/register' => 'register',
            '/api/v1/auth/login' => 'login',
            '/api/v1/auth/refresh' => 'refresh',
            '/api/v1/auth/logout' => 'logout',
            '/api/v1/auth/logout-all' => 'logoutAll',
            '/api/v1/auth/profile/update' => 'updateProfile',
        ];
        $action = $routeActions[$request->getUri()->getPath()] ?? '';
        if ($action === '') {
            return $this->respond(
                ['status' => 'FAILED', 'msgArr' => ['Unsupported authentication route.'], 'data' => []],
                $request,
                $tokenService,
                $responseFactory,
                $streamFactory,
            );
        }
        $actionData['action'] = $action;

        if (in_array($action, ['refresh', 'logout'], true) && $request->getHeaderLine('X-BBG-CSRF') !== '1') {
            return $this->respond(
                ['status' => 'FAILED', 'msgArr' => ['Missing required same-origin request header.'], 'data' => []],
                $request,
                $tokenService,
                $responseFactory,
                $streamFactory,
            );
        }

        $cookies = $request->getCookieParams();
        if (in_array($action, ['refresh', 'logout'], true)) {
            $actionData['_refreshToken'] = (string) ($cookies['bbg_refresh'] ?? '');
        }
        if (in_array($action, ['logoutAll', 'updateProfile'], true)) {
            $authorization = $request->getHeaderLine('Authorization');
            $actionData['_accessToken'] = str_starts_with($authorization, 'Bearer ')
                ? trim(substr($authorization, 7))
                : '';
        }

        $serverParams = $request->getServerParams();
        $actionData['_ipAddress'] = (string) ($serverParams['REMOTE_ADDR'] ?? '');
        $actionData['_userAgent'] = $request->getHeaderLine('User-Agent');
        $authParam['actionData'] = $actionData;
        $input['authParam'] = $authParam;

        try {
            $resArr = $authServicesV1->manageAuth($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Authentication operation failed unexpectedly.'], 'data' => []];
        }

        return $this->respond($resArr, $request, $tokenService, $responseFactory, $streamFactory, $action);
    }

    public function actionGetAuth(
        ServerRequestInterface $request,
        AuthServicesV1 $authServicesV1,
        AuthTokenService $tokenService,
        ResponseFactoryInterface $responseFactory,
        StreamFactoryInterface $streamFactory,
    ): ResponseInterface {
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $authParam = is_array($input['authParam'] ?? null) ? $input['authParam'] : [];
        $actionData = is_array($authParam['actionData'] ?? null) ? $authParam['actionData'] : [];
        $routeActions = [
            '/api/v1/auth/profile' => 'getProfile',
            '/api/v1/auth/permissions' => 'getPermissions',
        ];
        $action = $routeActions[$request->getUri()->getPath()] ?? '';
        if ($action === '') {
            return $this->respond(
                ['status' => 'FAILED', 'msgArr' => ['Unsupported authentication route.'], 'data' => []],
                $request,
                $tokenService,
                $responseFactory,
                $streamFactory,
            );
        }
        $actionData['action'] = $action;
        $authorization = $request->getHeaderLine('Authorization');
        $actionData['_accessToken'] = str_starts_with($authorization, 'Bearer ')
            ? trim(substr($authorization, 7))
            : '';
        $authParam['actionData'] = $actionData;
        $input['authParam'] = $authParam;

        try {
            $resArr = $authServicesV1->getAuth($input);
        } catch (Throwable) {
            $resArr = ['status' => 'EXCEPTION', 'msgArr' => ['Authentication operation failed unexpectedly.'], 'data' => []];
        }

        return $this->respond($resArr, $request, $tokenService, $responseFactory, $streamFactory);
    }

    private function respond(
        array $resArr,
        ServerRequestInterface $request,
        AuthTokenService $tokenService,
        ResponseFactoryInterface $responseFactory,
        StreamFactoryInterface $streamFactory,
        string $action = '',
    ): ResponseInterface {
        $status = (string) ($resArr['status'] ?? 'EXCEPTION');
        $httpStatus = match ($status) {
            'SUCCESS' => ($action === 'register' ? 201 : 200),
            'FAILED' => 400,
            default => 500,
        };

        $refreshToken = null;
        if (isset($resArr['data']) && is_array($resArr['data']) && isset($resArr['data']['_refresh_token'])) {
            $refreshToken = (string) $resArr['data']['_refresh_token'];
            unset($resArr['data']['_refresh_token']);
        }

        try {
            $json = json_encode($resArr, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        } catch (Throwable) {
            $httpStatus = 500;
            $json = '{"status":"EXCEPTION","msgArr":["Unable to serialize API response."],"data":[]}';
        }

        $response = $responseFactory->createResponse($httpStatus)
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withBody($streamFactory->createStream($json));

        if ($refreshToken !== null && $status === 'SUCCESS') {
            $response = $response->withAddedHeader('Set-Cookie', $this->refreshCookie($refreshToken, $tokenService));
        } elseif (in_array($action, ['logout', 'logoutAll'], true) || ($action === 'refresh' && $status === 'FAILED')) {
            $response = $response->withAddedHeader('Set-Cookie', $this->clearRefreshCookie($tokenService));
        }

        return $response;
    }

    private function refreshCookie(string $refreshToken, AuthTokenService $tokenService): string
    {
        $secure = $tokenService->refreshCookieSecure();
        $sameSite = $tokenService->refreshCookieSameSite();
        if ($sameSite === 'None' && !$secure) {
            $sameSite = 'Lax';
        }
        $cookie = 'bbg_refresh=' . rawurlencode($refreshToken)
            . '; Path=/api/v1/auth; Max-Age=' . $tokenService->refreshTokenTtl()
            . '; HttpOnly; SameSite=' . $sameSite;
        if ($secure) {
            $cookie .= '; Secure';
        }
        $domain = $tokenService->refreshCookieDomain();
        if ($domain !== '' && !str_contains($domain, ';')) {
            $cookie .= '; Domain=' . $domain;
        }
        return $cookie;
    }

    private function clearRefreshCookie(AuthTokenService $tokenService): string
    {
        $cookie = 'bbg_refresh=; Path=/api/v1/auth; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite='
            . $tokenService->refreshCookieSameSite();
        if ($tokenService->refreshCookieSecure()) {
            $cookie .= '; Secure';
        }
        $domain = $tokenService->refreshCookieDomain();
        if ($domain !== '' && !str_contains($domain, ';')) {
            $cookie .= '; Domain=' . $domain;
        }
        return $cookie;
    }
}
