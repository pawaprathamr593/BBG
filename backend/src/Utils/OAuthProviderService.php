<?php

declare(strict_types=1);

namespace App\Utils;

use RuntimeException;
use Throwable;

/**
 * Server-side OAuth/OIDC adapter. Provider credentials are read only from
 * environment variables; authorization state is one-time and Redis-backed.
 */
final class OAuthProviderService
{
    private const STATE_TTL = 600;

    public function authorizationUrl(string $provider): string
    {
        $provider = strtoupper($provider);
        $config = $this->providerConfig($provider);
        $state = bin2hex(random_bytes(32));
        $nonce = bin2hex(random_bytes(32));
        $this->redis()->setex('bbg:oauth:state:' . hash('sha256', $state), self::STATE_TTL, json_encode([
            'provider' => $provider,
            'nonce' => $nonce,
            'created_at' => time(),
        ], JSON_THROW_ON_ERROR));

        $redirect = $this->redirectUri($provider);
        $params = match ($provider) {
            'GOOGLE' => [
                'client_id' => $config['client_id'], 'redirect_uri' => $redirect,
                'response_type' => 'code', 'scope' => 'openid email profile',
                'state' => $state, 'nonce' => $nonce, 'prompt' => 'select_account',
            ],
            'APPLE' => [
                'client_id' => $config['client_id'], 'redirect_uri' => $redirect,
                'response_type' => 'code id_token', 'response_mode' => 'form_post',
                'scope' => 'name email', 'state' => $state, 'nonce' => $nonce,
            ],
            'FACEBOOK' => [
                'client_id' => $config['client_id'], 'redirect_uri' => $redirect,
                'response_type' => 'code', 'scope' => 'email,public_profile',
                'state' => $state,
            ],
            'INSTAGRAM' => [
                'client_id' => $config['client_id'], 'redirect_uri' => $redirect,
                'response_type' => 'code', 'scope' => 'instagram_business_basic',
                'state' => $state,
            ],
            default => throw new RuntimeException('Unsupported social sign-in provider.'),
        };

        $endpoint = match ($provider) {
            'GOOGLE' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'APPLE' => 'https://appleid.apple.com/auth/authorize',
            'FACEBOOK' => 'https://www.facebook.com/v23.0/dialog/oauth',
            'INSTAGRAM' => 'https://www.instagram.com/oauth/authorize',
        };

        return $endpoint . '?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }

    /** @return array{provider:string,subject:string,email:?string,email_verified:bool,name:string,picture:?string} */
    public function complete(string $provider, array $parameters): array
    {
        $provider = strtoupper($provider);
        $state = (string) ($parameters['state'] ?? '');
        if ($state === '' || strlen($state) > 256) {
            throw new RuntimeException('OAuth state is missing or invalid.');
        }

        $redis = $this->redis();
        $stateKey = 'bbg:oauth:state:' . hash('sha256', $state);
        $stored = $redis->getDel($stateKey);
        if (!is_string($stored)) {
            throw new RuntimeException('OAuth state has expired or has already been used.');
        }
        $stateData = json_decode($stored, true);
        if (!is_array($stateData) || ($stateData['provider'] ?? '') !== $provider) {
            throw new RuntimeException('OAuth state does not match the selected provider.');
        }
        if (isset($parameters['error'])) {
            throw new RuntimeException('The provider did not authorize BBG sign-in.');
        }

        return match ($provider) {
            'GOOGLE' => $this->completeGoogle($parameters, (string) $stateData['nonce']),
            'APPLE' => $this->completeApple($parameters, (string) $stateData['nonce']),
            'FACEBOOK' => $this->completeFacebook($parameters),
            'INSTAGRAM' => $this->completeInstagram($parameters),
            default => throw new RuntimeException('Unsupported social sign-in provider.'),
        };
    }

    public function storePendingIdentity(array $identity): string
    {
        $ticket = bin2hex(random_bytes(32));
        $this->redis()->setex('bbg:oauth:pending:' . hash('sha256', $ticket), 600, json_encode($identity, JSON_THROW_ON_ERROR));
        return $ticket;
    }

    public function getPendingIdentity(string $ticket): ?array
    {
        if ($ticket === '' || strlen($ticket) > 128) return null;
        $value = $this->redis()->get('bbg:oauth:pending:' . hash('sha256', $ticket));
        if (!is_string($value)) return null;
        $identity = json_decode($value, true);
        return is_array($identity) ? $identity : null;
    }

    public function consumePendingIdentity(string $ticket): ?array
    {
        $key = 'bbg:oauth:pending:' . hash('sha256', $ticket);
        $redis = $this->redis();
        $value = $redis->getDel($key);
        if (!is_string($value)) return null;
        $identity = json_decode($value, true);
        return is_array($identity) ? $identity : null;
    }

    public function frontendOrigin(): string
    {
        $url = $this->env('BBG_FRONTEND_URL', 'http://localhost:4200');
        $parts = parse_url($url);
        if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])
            || !in_array($parts['scheme'], ['https', 'http'], true)
            || ($parts['scheme'] !== 'https' && $parts['host'] !== 'localhost')
        ) {
            throw new RuntimeException('BBG_FRONTEND_URL must be HTTPS (localhost is allowed for development).');
        }
        return $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
    }

    public function frontendCallbackUrl(): string
    {
        return rtrim($this->env('BBG_FRONTEND_URL', 'http://localhost:4200'), '/') . '/auth/callback';
    }

    private function completeGoogle(array $params, string $nonce): array
    {
        $code = (string) ($params['code'] ?? '');
        if ($code === '') {
            throw new RuntimeException('Google did not return an authorization code.');
        }
        $config = $this->providerConfig('GOOGLE');
        $tokens = $this->postForm('https://oauth2.googleapis.com/token', [
            'code' => $code, 'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'redirect_uri' => $this->redirectUri('GOOGLE'), 'grant_type' => 'authorization_code',
        ]);
        $claims = $this->verifyJwt((string) ($tokens['id_token'] ?? ''), 'https://www.googleapis.com/oauth2/v3/certs');
        $this->assertClaims($claims, ['https://accounts.google.com', 'accounts.google.com'], $config['client_id'], $nonce);
        return $this->identity('GOOGLE', $claims['sub'] ?? '', $claims['email'] ?? null,
            filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN),
            (string) ($claims['name'] ?? ''), $claims['picture'] ?? null);
    }

    private function completeApple(array $params, string $nonce): array
    {
        $config = $this->providerConfig('APPLE');
        $token = (string) ($params['id_token'] ?? '');
        if ($token === '') {
            throw new RuntimeException('Apple did not return an identity token.');
        }
        $claims = $this->verifyJwt($token, 'https://appleid.apple.com/auth/keys');
        $this->assertClaims($claims, ['https://appleid.apple.com'], $config['client_id'], $nonce);
        $name = '';
        $userJson = $params['user'] ?? null;
        if (is_string($userJson)) {
            $user = json_decode($userJson, true);
            if (is_array($user)) {
                $name = trim((string) (($user['name']['firstName'] ?? '') . ' ' . ($user['name']['lastName'] ?? '')));
            }
        }
        return $this->identity('APPLE', $claims['sub'] ?? '', $claims['email'] ?? null,
            filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN), $name, null);
    }

    private function completeFacebook(array $params): array
    {
        $code = (string) ($params['code'] ?? '');
        if ($code === '') {
            throw new RuntimeException('Facebook did not return an authorization code.');
        }
        $config = $this->providerConfig('FACEBOOK');
        $tokens = $this->getJson('https://graph.facebook.com/v23.0/oauth/access_token?' . http_build_query([
            'client_id' => $config['client_id'], 'client_secret' => $config['client_secret'],
            'redirect_uri' => $this->redirectUri('FACEBOOK'), 'code' => $code,
        ], '', '&', PHP_QUERY_RFC3986));
        $accessToken = (string) ($tokens['access_token'] ?? '');
        if ($accessToken === '') {
            throw new RuntimeException('Facebook token exchange failed.');
        }
        $debug = $this->getJson('https://graph.facebook.com/debug_token?' . http_build_query([
            'input_token' => $accessToken, 'access_token' => $config['client_id'] . '|' . $config['client_secret'],
        ], '', '&', PHP_QUERY_RFC3986));
        $data = $debug['data'] ?? [];
        if (!is_array($data) || empty($data['is_valid']) || (string) ($data['app_id'] ?? '') !== $config['client_id']) {
            throw new RuntimeException('Facebook access token could not be validated for this BBG app.');
        }
        $profile = $this->getJson('https://graph.facebook.com/me?' . http_build_query([
            'fields' => 'id,name,email,picture.type(large)', 'access_token' => $accessToken,
        ], '', '&', PHP_QUERY_RFC3986));
        return $this->identity('FACEBOOK', $profile['id'] ?? '', $profile['email'] ?? null,
            false, (string) ($profile['name'] ?? ''), $profile['picture']['data']['url'] ?? null);
    }

    private function completeInstagram(array $params): array
    {
        $code = (string) ($params['code'] ?? '');
        if ($code === '') {
            throw new RuntimeException('Instagram did not return an authorization code.');
        }
        $config = $this->providerConfig('INSTAGRAM');
        $tokens = $this->postForm('https://api.instagram.com/oauth/access_token', [
            'client_id' => $config['client_id'], 'client_secret' => $config['client_secret'],
            'grant_type' => 'authorization_code', 'redirect_uri' => $this->redirectUri('INSTAGRAM'),
            'code' => $code,
        ]);
        $accessToken = (string) ($tokens['access_token'] ?? '');
        if ($accessToken === '') {
            throw new RuntimeException('Instagram token exchange failed.');
        }
        $profile = $this->getJson('https://graph.instagram.com/me?' . http_build_query([
            'fields' => 'user_id,username', 'access_token' => $accessToken,
        ], '', '&', PHP_QUERY_RFC3986));
        return $this->identity('INSTAGRAM', $profile['user_id'] ?? $profile['id'] ?? '', null, false,
            (string) ($profile['username'] ?? ''), null);
    }

    private function identity(string $provider, mixed $subject, mixed $email, bool $verified, string $name, mixed $picture): array
    {
        $subject = trim((string) $subject);
        $email = is_string($email) ? strtolower(trim($email)) : '';
        if ($subject === '' || strlen($subject) > 190) {
            throw new RuntimeException('The provider returned an invalid account identifier.');
        }
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $email = '';
            $verified = false;
        }
        return [
            'provider' => $provider, 'subject' => $subject,
            'email' => $email !== '' ? $email : null,
            'email_verified' => $verified && $email !== '',
            'name' => mb_substr(trim($name), 0, 150),
            'picture' => is_string($picture) ? mb_substr($picture, 0, 500) : null,
        ];
    }

    private function providerConfig(string $provider): array
    {
        $prefix = match ($provider) {
            'GOOGLE' => 'GOOGLE_OAUTH',
            'APPLE' => 'APPLE_OAUTH',
            'FACEBOOK' => 'FACEBOOK_OAUTH',
            'INSTAGRAM' => 'INSTAGRAM_OAUTH',
            default => throw new RuntimeException('Unsupported social sign-in provider.'),
        };
        $clientId = $this->env($prefix . '_CLIENT_ID');
        $clientSecret = $this->env($prefix . '_CLIENT_SECRET');
        if ($clientId === '' || ($provider !== 'APPLE' && $clientSecret === '')) {
            throw new RuntimeException($provider . ' sign-in is not configured on this BBG environment.');
        }
        return ['client_id' => $clientId, 'client_secret' => $clientSecret];
    }

    private function redirectUri(string $provider): string
    {
        $key = 'BBG_' . $provider . '_OAUTH_REDIRECT_URI';
        $uri = $this->env($key);
        if ($uri === '') {
            $base = rtrim($this->env('BBG_API_BASE_URL', 'http://localhost:8080'), '/');
            $uri = $base . '/api/v1/auth/oauth/' . strtolower($provider) . '/callback';
        }
        if (!str_starts_with($uri, 'https://') && !str_starts_with($uri, 'http://localhost')) {
            throw new RuntimeException('OAuth redirect URI must use HTTPS (localhost is allowed for development).');
        }
        return $uri;
    }

    private function assertClaims(array $claims, array $issuers, string $audience, string $nonce): void
    {
        $now = time();
        $aud = $claims['aud'] ?? null;
        $audiences = is_array($aud) ? $aud : [$aud];
        if (!in_array((string) ($claims['iss'] ?? ''), $issuers, true)
            || !in_array($audience, $audiences, true)
            || (int) ($claims['exp'] ?? 0) <= $now
            || !isset($claims['iat'])
            || (int) ($claims['iat'] ?? 0) > $now + 60
            || !hash_equals($nonce, (string) ($claims['nonce'] ?? ''))
        ) {
            throw new RuntimeException('The provider identity token failed issuer, audience, expiry or nonce validation.');
        }
    }

    private function verifyJwt(string $jwt, string $jwksUrl): array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new RuntimeException('Provider returned a malformed identity token.');
        }
        [$head, $body, $signature] = $parts;
        $header = json_decode($this->base64UrlDecode($head), true);
        $claims = json_decode($this->base64UrlDecode($body), true);
        if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) {
            throw new RuntimeException('Provider identity token uses an unsupported signing method.');
        }
        $jwks = $this->getJson($jwksUrl);
        $jwk = null;
        foreach (($jwks['keys'] ?? []) as $key) {
            if (($key['kid'] ?? '') === $header['kid'] && ($key['kty'] ?? '') === 'RSA') {
                $jwk = $key;
                break;
            }
        }
        if (!is_array($jwk)) {
            throw new RuntimeException('Provider signing key was not found.');
        }
        $pem = $this->rsaJwkToPem((string) $jwk['n'], (string) $jwk['e']);
        $decodedSignature = $this->base64UrlDecode($signature);
        if (openssl_verify($head . '.' . $body, $decodedSignature, $pem, OPENSSL_ALGO_SHA256) !== 1) {
            throw new RuntimeException('Provider identity token signature is invalid.');
        }
        return $claims;
    }

    private function rsaJwkToPem(string $modulus, string $exponent): string
    {
        $sequence = $this->derSequence($this->derInteger($this->base64UrlDecode($modulus)) . $this->derInteger($this->base64UrlDecode($exponent)));
        $rsaOid = hex2bin('300d06092a864886f70d0101010500');
        $bitString = "\x03" . $this->derLength(strlen($sequence) + 1) . "\x00" . $sequence;
        $spki = $this->derSequence($rsaOid . $bitString);
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    private function derInteger(string $value): string
    {
        $value = ltrim($value, "\x00");
        if ($value === '' || (ord($value[0]) & 0x80)) {
            $value = "\x00" . $value;
        }
        return "\x02" . $this->derLength(strlen($value)) . $value;
    }

    private function derSequence(string $value): string
    {
        return "\x30" . $this->derLength(strlen($value)) . $value;
    }

    private function derLength(int $length): string
    {
        if ($length < 128) return chr($length);
        $encoded = ltrim(pack('N', $length), "\x00");
        return chr(0x80 | strlen($encoded)) . $encoded;
    }

    private function postForm(string $url, array $data): array
    {
        return $this->requestJson($url, 'POST', $data);
    }

    private function getJson(string $url): array
    {
        return $this->requestJson($url, 'GET');
    }

    private function requestJson(string $url, string $method, array $data = []): array
    {
        $curl = curl_init($url);
        if ($curl === false) throw new RuntimeException('Unable to initialize provider request.');
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 15,
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        if ($method === 'POST') {
            curl_setopt($curl, CURLOPT_POST, true);
            curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));
            curl_setopt($curl, CURLOPT_HTTPHEADER, ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded']);
        }
        $body = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if (!is_string($body) || $status < 200 || $status >= 300) {
            throw new RuntimeException('Provider request failed (HTTP ' . $status . '). ' . ($error !== '' ? 'Network error.' : ''));
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) throw new RuntimeException('Provider returned an invalid response.');
        return $decoded;
    }

    private function redis(): \Redis
    {
        if (!class_exists(\Redis::class)) throw new RuntimeException('Redis PHP extension is not installed.');
        $redis = new \Redis();
        $host = $this->env('REDIS_HOST') ?: 'redis';
        $port = (int) ($this->env('REDIS_PORT') ?: '6379');
        if (!$redis->connect($host, $port, 2.0)) throw new RuntimeException('Unable to connect to the BBG authentication cache.');
        $password = $this->env('REDIS_PASSWORD');
        if ($password !== '' && !$redis->auth($password)) throw new RuntimeException('Unable to authenticate with the BBG authentication cache.');
        return $redis;
    }

    private function env(string $key, string $default = ''): string
    {
        $value = getenv($key);
        return $value === false ? $default : trim($value);
    }

    private function base64UrlDecode(string $value): string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4), true);
        if ($decoded === false) throw new RuntimeException('Invalid provider token encoding.');
        return $decoded;
    }
}
