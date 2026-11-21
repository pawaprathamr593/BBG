<?php

declare(strict_types=1);

namespace App\Api\Shared;

use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final readonly class CorsMiddleware implements MiddlewareInterface
{
    public function __construct(
        private ResponseFactoryInterface $responseFactory,
    ) {}

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $origin = trim($request->getHeaderLine('Origin'));
        $allowedOrigins = $this->resolveAllowedOrigins();
        $isAllowedOrigin = $origin !== '' && in_array($origin, $allowedOrigins, true);

        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            $response = $this->responseFactory->createResponse(204);
            return $isAllowedOrigin ? $this->withCorsHeaders($response, $origin) : $response;
        }

        $response = $handler->handle($request);
        return $isAllowedOrigin ? $this->withCorsHeaders($response, $origin) : $response;
    }

    private function withCorsHeaders(ResponseInterface $response, string $origin): ResponseInterface
    {
        return $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Vary', 'Origin')
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader(
                'Access-Control-Allow-Headers',
                'Content-Type, Authorization, X-BBG-CSRF, X-Requested-With, Accept',
            )
            ->withHeader('Access-Control-Max-Age', '600');
    }

    /**
     * @return list<string>
     */
    private function resolveAllowedOrigins(): array
    {
        $raw = (string) (getenv('CORS_ALLOWED_ORIGINS') ?: getenv('AUTH_SOCIAL_ALLOWED_ORIGINS') ?: '');
        $origins = array_values(array_filter(array_map(
            static fn(string $item): string => rtrim(trim($item), '/'),
            explode(',', $raw),
        )));

        $appEnv = strtolower(trim((string) (getenv('APP_ENV') ?: 'dev')));
        if ($appEnv !== 'prod' && $appEnv !== 'production') {
            foreach (['http://localhost:4200', 'http://127.0.0.1:4200'] as $devOrigin) {
                if (!in_array($devOrigin, $origins, true)) {
                    $origins[] = $devOrigin;
                }
            }
        }

        return $origins;
    }
}
