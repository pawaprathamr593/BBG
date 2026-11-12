<?php

declare(strict_types=1);

namespace App\Utils;

use RuntimeException;

final class AuthTokenService
{
    public function assertConfigured(): void
    {
        $secret = $this->env('AUTH_ACCESS_TOKEN_SECRET', '');
        if (strlen($secret) < 32 || str_contains($secret, 'replace_with')) {
            throw new RuntimeException('AUTH_ACCESS_TOKEN_SECRET must be a generated secret of at least 32 characters.');
        }
    }

    public function issueAccessToken(int $userId, string $sessionUuid): string
    {
        $this->assertConfigured();
        $now = time();
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload = [
            'iss' => $this->env('AUTH_TOKEN_ISSUER', 'bbg'),
            'aud' => $this->env('AUTH_TOKEN_AUDIENCE', 'bbg-web'),
            'sub' => (string) $userId,
            'sid' => $sessionUuid,
            'iat' => $now,
            'exp' => $now + $this->accessTokenTtl(),
        ];
        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];
        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, $this->env('AUTH_ACCESS_TOKEN_SECRET', ''), true);

        return $signingInput . '.' . $this->base64UrlEncode($signature);
    }

    /** @return array{sub:string,sid:string,exp:int,iat:int}|null */
    public function verifyAccessToken(string $token): ?array
    {
        try {
            $this->assertConfigured();
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return null;
            }
            [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
            $header = json_decode($this->base64UrlDecode($encodedHeader), true, 512, JSON_THROW_ON_ERROR);
            $payload = json_decode($this->base64UrlDecode($encodedPayload), true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($header) || ($header['alg'] ?? null) !== 'HS256' || !is_array($payload)) {
                return null;
            }
            $expected = $this->base64UrlEncode(
                hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, $this->env('AUTH_ACCESS_TOKEN_SECRET', ''), true),
            );
            if (!hash_equals($expected, $encodedSignature)) {
                return null;
            }
            $now = time();
            if (($payload['iss'] ?? null) !== $this->env('AUTH_TOKEN_ISSUER', 'bbg')
                || ($payload['aud'] ?? null) !== $this->env('AUTH_TOKEN_AUDIENCE', 'bbg-web')
                || !isset($payload['sub'], $payload['sid'], $payload['exp'], $payload['iat'])
                || !is_string($payload['sub']) || !ctype_digit($payload['sub'])
                || !is_string($payload['sid']) || !is_int($payload['exp']) || !is_int($payload['iat'])
                || $payload['exp'] <= $now || $payload['iat'] > $now + 60
            ) {
                return null;
            }

            return ['sub' => $payload['sub'], 'sid' => $payload['sid'], 'exp' => $payload['exp'], 'iat' => $payload['iat']];
        } catch (\Throwable) {
            return null;
        }
    }

    public function generateRefreshToken(): string
    {
        return bin2hex(random_bytes(48));
    }

    public function hashRefreshToken(string $refreshToken): string
    {
        return hash('sha256', $refreshToken);
    }

    public function accessTokenTtl(): int
    {
        return max(60, (int) $this->env('AUTH_ACCESS_TOKEN_TTL', '900'));
    }

    public function refreshTokenTtl(): int
    {
        return max(3600, (int) $this->env('AUTH_REFRESH_TOKEN_TTL', '2592000'));
    }

    public function refreshCookieSecure(): bool
    {
        $default = $this->env('APP_ENV', 'dev') === 'prod' ? 'true' : 'false';
        return filter_var($this->env('AUTH_REFRESH_COOKIE_SECURE', $default), FILTER_VALIDATE_BOOLEAN);
    }

    public function refreshCookieSameSite(): string
    {
        $value = ucfirst(strtolower($this->env('AUTH_REFRESH_COOKIE_SAMESITE', 'Lax')));
        return in_array($value, ['Lax', 'Strict', 'None'], true) ? $value : 'Lax';
    }

    public function refreshCookieDomain(): string
    {
        return $this->env('AUTH_REFRESH_COOKIE_DOMAIN', '');
    }

    private function env(string $key, string $default): string
    {
        $value = getenv($key);
        return $value === false || $value === '' ? $default : $value;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);
        if ($decoded === false) {
            throw new RuntimeException('Invalid token encoding.');
        }
        return $decoded;
    }
}
