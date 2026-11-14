<?php

declare(strict_types=1);

namespace App\Modules\Api\V1\Controllers;

use App\Modules\Api\V1\Services\Implementations\AuthServicesV1;
use App\Services\Implementations\SocialEmailOtpService;
use App\Utils\AuthTokenService;
use App\Utils\OAuthProviderService;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Throwable;

final class OAuthController
{
    public function actionStartGoogle(OAuthProviderService $oauth, ResponseFactoryInterface $responses): ResponseInterface
    {
        return $this->redirect($oauth, 'GOOGLE', $responses);
    }

    public function actionStartApple(OAuthProviderService $oauth, ResponseFactoryInterface $responses): ResponseInterface
    {
        return $this->redirect($oauth, 'APPLE', $responses);
    }

    public function actionStartFacebook(OAuthProviderService $oauth, ResponseFactoryInterface $responses): ResponseInterface
    {
        return $this->redirect($oauth, 'FACEBOOK', $responses);
    }

    public function actionStartInstagram(OAuthProviderService $oauth, ResponseFactoryInterface $responses): ResponseInterface
    {
        return $this->redirect($oauth, 'INSTAGRAM', $responses);
    }

    public function actionCallbackGoogle(
        ServerRequestInterface $request, OAuthProviderService $oauth, AuthServicesV1 $auth,
        AuthTokenService $tokens, ResponseFactoryInterface $responses, StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->callback('GOOGLE', $request, $oauth, $auth, $tokens, $responses, $streams);
    }

    public function actionCallbackApple(
        ServerRequestInterface $request, OAuthProviderService $oauth, AuthServicesV1 $auth,
        AuthTokenService $tokens, ResponseFactoryInterface $responses, StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->callback('APPLE', $request, $oauth, $auth, $tokens, $responses, $streams);
    }

    public function actionCallbackFacebook(
        ServerRequestInterface $request, OAuthProviderService $oauth, AuthServicesV1 $auth,
        AuthTokenService $tokens, ResponseFactoryInterface $responses, StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->callback('FACEBOOK', $request, $oauth, $auth, $tokens, $responses, $streams);
    }

    public function actionCallbackInstagram(
        ServerRequestInterface $request, OAuthProviderService $oauth, AuthServicesV1 $auth,
        AuthTokenService $tokens, ResponseFactoryInterface $responses, StreamFactoryInterface $streams,
    ): ResponseInterface {
        return $this->callback('INSTAGRAM', $request, $oauth, $auth, $tokens, $responses, $streams);
    }

    public function actionSendEmailOtp(
        ServerRequestInterface $request,
        OAuthProviderService $oauth,
        SocialEmailOtpService $otp,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $ticket = (string) ($input['ticket'] ?? '');
        $email = (string) ($input['email'] ?? '');
        try {
            if ($oauth->getPendingIdentity($ticket) === null) {
                return $this->json($responses, $streams, ['status' => 'FAILED', 'msgArr' => ['The social sign-in request has expired. Start again.'], 'data' => []], 400);
            }
            $result = $otp->request($ticket, $email);
            return $this->json($responses, $streams, ['status' => 'SUCCESS', 'msgArr' => ['A verification code has been sent.'], 'data' => $result], 200);
        } catch (Throwable $exception) {
            return $this->json($responses, $streams, ['status' => 'FAILED', 'msgArr' => [$exception->getMessage()], 'data' => []], 400);
        }
    }

    public function actionVerifyEmailOtp(
        ServerRequestInterface $request,
        OAuthProviderService $oauth,
        SocialEmailOtpService $otp,
        AuthServicesV1 $auth,
        AuthTokenService $tokens,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        $body = $request->getParsedBody();
        $input = is_array($body) ? $body : [];
        $ticket = (string) ($input['ticket'] ?? '');
        $email = (string) ($input['email'] ?? '');
        $code = (string) ($input['code'] ?? '');
        try {
            $identity = $oauth->getPendingIdentity($ticket);
            if ($identity === null) {
                return $this->json($responses, $streams, ['status' => 'FAILED', 'msgArr' => ['The social sign-in request has expired. Start again.'], 'data' => []], 400);
            }
            $verifiedEmail = $otp->verify($ticket, $email, $code);
            $identity['email'] = $verifiedEmail;
            $identity['email_verified'] = true;
            $result = $auth->manageAuth(['authParam' => [
                'actionType' => 'socialLogin',
                'actionData' => $this->authActionData($identity, $request),
            ]]);
            if (($result['status'] ?? '') !== 'SUCCESS') {
                return $this->json($responses, $streams, $result, 400);
            }
            $oauth->consumePendingIdentity($ticket);
            return $this->jsonWithRefreshCookie($responses, $streams, $tokens, $result, 200);
        } catch (Throwable $exception) {
            return $this->json($responses, $streams, ['status' => 'FAILED', 'msgArr' => [$exception->getMessage()], 'data' => []], 400);
        }
    }

    private function redirect(OAuthProviderService $oauth, string $provider, ResponseFactoryInterface $responses): ResponseInterface
    {
        try {
            return $responses->createResponse(302)->withHeader('Location', $oauth->authorizationUrl($provider));
        } catch (Throwable) {
            return $responses->createResponse(503)
                ->withHeader('Content-Type', 'text/plain; charset=utf-8')
                ->withBody((new \HttpSoft\Message\StreamFactory())->createStream('This social sign-in provider is not configured.'));
        }
    }

    private function callback(
        string $provider,
        ServerRequestInterface $request,
        OAuthProviderService $oauth,
        AuthServicesV1 $auth,
        AuthTokenService $tokens,
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
    ): ResponseInterface {
        try {
            $params = $request->getQueryParams();
            if ($provider === 'APPLE') {
                $body = $request->getParsedBody();
                if (is_array($body)) {
                    $params = array_merge($params, $body);
                } else {
                    parse_str((string) $request->getBody(), $form);
                    if (is_array($form)) $params = array_merge($params, $form);
                }
            }
            $identity = $oauth->complete($provider, $params);
            $result = $auth->manageAuth(['authParam' => [
                'actionType' => 'socialLogin',
                'actionData' => $this->authActionData($identity, $request),
            ]]);

            if (($result['status'] ?? '') === 'EMAIL_REQUIRED') {
                $ticket = $oauth->storePendingIdentity($identity);
                return $this->popupMessage($responses, $streams, $oauth, [
                    'type' => 'BBG_OAUTH_EMAIL_REQUIRED',
                    'ticket' => $ticket,
                    'provider' => $provider,
                    'email' => $identity['email'] ?? null,
                    'message' => 'Verify an email address to finish signing in.',
                ]);
            }
            if (($result['status'] ?? '') !== 'SUCCESS') {
                return $this->popupMessage($responses, $streams, $oauth, [
                    'type' => 'BBG_OAUTH_ERROR',
                    'message' => $result['msgArr'][0] ?? 'Social sign-in could not be completed.',
                ], 400);
            }

            $refreshToken = (string) ($result['data']['_refresh_token'] ?? '');
            unset($result['data']['_refresh_token']);
            return $this->popupMessage($responses, $streams, $oauth, [
                'type' => 'BBG_OAUTH_SUCCESS',
                'payload' => $result,
            ])->withAddedHeader('Set-Cookie', $this->refreshCookie($refreshToken, $tokens));
        } catch (Throwable $exception) {
            try {
                return $this->popupMessage($responses, $streams, $oauth, [
                    'type' => 'BBG_OAUTH_ERROR',
                    'message' => 'Social sign-in could not be verified. Please try again.',
                ], 400);
            } catch (Throwable) {
                return $responses->createResponse(400);
            }
        }
    }

    private function authActionData(array $identity, ServerRequestInterface $request): array
    {
        $server = $request->getServerParams();
        return [
            'provider' => $identity['provider'] ?? '',
            'subject' => $identity['subject'] ?? '',
            'email' => $identity['email'] ?? null,
            'email_verified' => $identity['email_verified'] ?? false,
            'name' => $identity['name'] ?? '',
            'picture' => $identity['picture'] ?? null,
            '_ipAddress' => (string) ($server['REMOTE_ADDR'] ?? ''),
            '_userAgent' => $request->getHeaderLine('User-Agent'),
        ];
    }

    private function popupMessage(
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        OAuthProviderService $oauth,
        array $message,
        int $status = 200,
    ): ResponseInterface {
        $origin = json_encode($oauth->frontendOrigin(), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);
        $payload = json_encode($message, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);
        $html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BBG sign-in</title></head>'
            . '<body><p>Returning to BBG…</p><script>(function(){var target=' . $origin . ';var message=' . $payload . ';'
            . 'if(window.opener){window.opener.postMessage(message,target);window.close();}'
            . 'else{document.body.textContent="You can close this window and return to BBG.";}})();</script></body></html>';
        return $responses->createResponse($status)
            ->withHeader('Content-Type', 'text/html; charset=utf-8')
            ->withHeader('Cache-Control', 'no-store')
            ->withHeader('Referrer-Policy', 'no-referrer')
            ->withBody($streams->createStream($html));
    }

    private function json(
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        array $payload,
        int $status,
    ): ResponseInterface {
        return $responses->createResponse($status)
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withHeader('Cache-Control', 'no-store')
            ->withBody($streams->createStream(json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)));
    }

    private function jsonWithRefreshCookie(
        ResponseFactoryInterface $responses,
        StreamFactoryInterface $streams,
        AuthTokenService $tokens,
        array $payload,
        int $status,
    ): ResponseInterface {
        $refreshToken = (string) ($payload['data']['_refresh_token'] ?? '');
        unset($payload['data']['_refresh_token']);
        $response = $this->json($responses, $streams, $payload, $status);
        return $refreshToken !== '' ? $response->withAddedHeader('Set-Cookie', $this->refreshCookie($refreshToken, $tokens)) : $response;
    }

    private function refreshCookie(string $refreshToken, AuthTokenService $tokens): string
    {
        $sameSite = $tokens->refreshCookieSameSite();
        $secure = $tokens->refreshCookieSecure();
        if ($sameSite === 'None' && !$secure) $sameSite = 'Lax';
        $cookie = 'bbg_refresh=' . rawurlencode($refreshToken)
            . '; Path=/api/v1/auth; Max-Age=' . $tokens->refreshTokenTtl()
            . '; HttpOnly; SameSite=' . $sameSite;
        if ($secure) $cookie .= '; Secure';
        $domain = $tokens->refreshCookieDomain();
        if ($domain !== '' && !str_contains($domain, ';')) $cookie .= '; Domain=' . $domain;
        return $cookie;
    }
}
