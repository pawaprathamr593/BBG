<?php

declare(strict_types=1);

namespace App\Utils;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use RuntimeException;
use Throwable;

/**
 * Verifies third-party login credentials and returns a normalized identity.
 * This class never persists provider credentials or returns raw tokens.
 */
final class SocialProviderTokenVerifier
{
    /**
     * @return array{provider:string,subject:string,email:?string,email_verified:bool,full_name:string,profile_image:?string}
     */
    public function verify(string $provider, string $credential, array $context = []): array
    {
        $provider = strtoupper(trim($provider));
        if ($credential === '' || strlen($credential) > 20000) {
            throw new RuntimeException('A valid provider credential is required.');
        }

        return match ($provider) {
            'GOOGLE' => $this->verifyGoogle($credential, (string) ($context['nonce'] ?? '')),
            'APPLE' => $this->verifyApple($credential, (string) ($context['nonce'] ?? ''), (string) ($context['full_name'] ?? ''), (string) ($context['redirect_uri'] ?? '')),
            'FACEBOOK' => $this->verifyFacebook($credential),
            'INSTAGRAM' => $this->verifyInstagram($credential, (string) ($context['redirect_uri'] ?? '')),
            default => throw new RuntimeException('This social sign-in provider is not supported.'),
        };
    }

    private function verifyGoogle(string $token, string $nonce): array
    {
        $clientId = $this->env('AUTH_GOOGLE_CLIENT_ID');
        if ($clientId === '') {
            throw new RuntimeException('Google sign-in is not configured yet.');
        }
        $claims = $this->decodeSignedToken($token, 'https://www.googleapis.com/oauth2/v3/certs');
        $this->assertJwtClaims($claims, ['https://accounts.google.com', 'accounts.google.com'], $clientId);
        if ($nonce === '' || !hash_equals($nonce, (string) ($claims->nonce ?? ''))) {
            throw new RuntimeException('Google sign-in could not be verified. Please try again.');
        }
        $subject = (string) ($claims->sub ?? '');
        if ($subject === '') {
            throw new RuntimeException('Google did not return a stable account identifier.');
        }
        $email = strtolower(trim((string) ($claims->email ?? '')));
        $emailIsValid = filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
        $providerVerified = ($claims->email_verified ?? false) === true || ($claims->email_verified ?? '') === 'true';
        $googleIsAuthoritative = str_ends_with($email, '@gmail.com') || trim((string) ($claims->hd ?? '')) !== '';
        $emailVerified = $providerVerified && $googleIsAuthoritative;

        return $this->identity(
            'GOOGLE',
            $subject,
            $emailIsValid ? $email : null,
            $emailVerified,
            (string) ($claims->name ?? ''),
            (string) ($claims->picture ?? ''),
        );
    }

    private function verifyApple(string $authorizationCode, string $nonce, string $fallbackName, string $redirectUri): array
    {
        $clientId = $this->env('AUTH_APPLE_CLIENT_ID');
        $teamId = $this->env('AUTH_APPLE_TEAM_ID');
        $keyId = $this->env('AUTH_APPLE_KEY_ID');
        $privateKey = str_replace('\\n', "\n", $this->env('AUTH_APPLE_PRIVATE_KEY'));
        if ($clientId === '' || $teamId === '' || $keyId === '' || $privateKey === '') {
            throw new RuntimeException('Apple sign-in is not fully configured yet.');
        }
        if ($nonce === '' || $redirectUri === '' || strlen($redirectUri) > 1000) {
            throw new RuntimeException('Apple sign-in state is incomplete. Please try again.');
        }

        $clientSecret = $this->createAppleClientSecret($clientId, $teamId, $keyId, $privateKey);
        $tokenResponse = $this->postForm('https://appleid.apple.com/auth/token', [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'code' => $authorizationCode,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirectUri,
        ]);
        $identityToken = (string) ($tokenResponse['id_token'] ?? '');
        if ($identityToken === '') {
            throw new RuntimeException('Apple did not return a verifiable identity token.');
        }

        $claims = $this->decodeSignedToken($identityToken, 'https://appleid.apple.com/auth/keys');
        $this->assertJwtClaims($claims, ['https://appleid.apple.com'], $clientId);
        $tokenNonce = (string) ($claims->nonce ?? '');
        $hashedNonce = hash('sha256', $nonce);
        if (!hash_equals($nonce, $tokenNonce) && !hash_equals($hashedNonce, $tokenNonce)) {
            throw new RuntimeException('Apple sign-in could not be verified. Please try again.');
        }
        $subject = (string) ($claims->sub ?? '');
        if ($subject === '') {
            throw new RuntimeException('Apple did not return a stable account identifier.');
        }
        $email = strtolower(trim((string) ($claims->email ?? '')));
        $emailVerified = ($claims->email_verified ?? false) === true || ($claims->email_verified ?? '') === 'true';

        return $this->identity(
            'APPLE',
            $subject,
            filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null,
            $emailVerified,
            $fallbackName,
            '',
        );
    }

    private function createAppleClientSecret(string $clientId, string $teamId, string $keyId, string $privateKey): string
    {
        try {
            return JWT::encode([
                'iss' => $teamId,
                'iat' => time(),
                'exp' => time() + 300,
                'aud' => 'https://appleid.apple.com',
                'sub' => $clientId,
            ], $privateKey, 'ES256', $keyId);
        } catch (Throwable) {
            throw new RuntimeException('Apple server credentials could not be used to verify sign-in.');
        }
    }

    private function verifyFacebook(string $accessToken): array
    {
        $appId = $this->env('AUTH_FACEBOOK_APP_ID');
        $appSecret = $this->env('AUTH_FACEBOOK_APP_SECRET');
        if ($appId === '' || $appSecret === '') {
            throw new RuntimeException('Facebook sign-in is not configured yet.');
        }

        $debug = $this->verifyMetaAccessToken($accessToken, $appId, $appSecret);
        $version = $this->metaVersion();
        $profile = $this->getJson(
            'https://graph.facebook.com/' . $version . '/me?' . http_build_query([
                'fields' => 'id,name,email,picture.type(large)',
                'access_token' => $accessToken,
            ]),
        );
        $subject = (string) ($profile['id'] ?? '');
        if ($subject === '' || $subject !== (string) ($debug['user_id'] ?? '')) {
            throw new RuntimeException('Facebook account verification failed.');
        }
        $email = strtolower(trim((string) ($profile['email'] ?? '')));

        return $this->identity(
            'FACEBOOK',
            $subject,
            filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null,
            false,
            (string) ($profile['name'] ?? ''),
            (string) ($profile['picture']['data']['url'] ?? ''),
        );
    }

    private function verifyInstagram(string $authorizationCode, string $redirectUri): array
    {
        $appId = $this->env('AUTH_INSTAGRAM_APP_ID');
        $appSecret = $this->env('AUTH_INSTAGRAM_APP_SECRET');
        if ($appId === '' || $appSecret === '') {
            throw new RuntimeException('Instagram professional-account sign-in is not configured yet.');
        }
        if ($redirectUri === '' || strlen($redirectUri) > 1000) {
            throw new RuntimeException('Instagram redirect URI is missing.');
        }

        $tokenResponse = $this->postForm('https://api.instagram.com/oauth/access_token', [
            'client_id' => $appId,
            'client_secret' => $appSecret,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirectUri,
            'code' => $authorizationCode,
        ]);
        $accessToken = (string) ($tokenResponse['access_token'] ?? '');
        if ($accessToken === '') {
            throw new RuntimeException('Instagram did not return an access token.');
        }

        // The authorization code was exchanged with the Instagram-specific app credentials.
        // Confirm the resulting short-lived token by calling Instagram's own /me endpoint.
        $profile = $this->getJson(
            'https://graph.instagram.com/me?' . http_build_query([
                'fields' => 'user_id,username',
                'access_token' => $accessToken,
            ]),
        );
        $subject = (string) ($profile['user_id'] ?? $profile['id'] ?? '');
        $tokenSubject = (string) ($tokenResponse['user_id'] ?? '');
        if ($subject === '' || ($tokenSubject !== '' && $tokenSubject !== $subject)) {
            throw new RuntimeException('Instagram account verification failed.');
        }

        return $this->identity('INSTAGRAM', $subject, null, false, (string) ($profile['username'] ?? ''), '');
    }

    private function verifyMetaAccessToken(string $token, string $appId, string $appSecret): array
    {
        $debug = $this->getJson(
            'https://graph.facebook.com/' . $this->metaVersion() . '/debug_token?' . http_build_query([
                'input_token' => $token,
                'access_token' => $appId . '|' . $appSecret,
            ]),
        );
        $data = is_array($debug['data'] ?? null) ? $debug['data'] : [];
        $expiresAt = (int) ($data['expires_at'] ?? 0);
        if (($data['is_valid'] ?? false) !== true
            || (string) ($data['app_id'] ?? '') !== $appId
            || ($expiresAt > 0 && $expiresAt <= time())
        ) {
            throw new RuntimeException('The provider access token is invalid, expired or issued to another application.');
        }
        return $data;
    }

    private function decodeSignedToken(string $token, string $jwksUrl): object
    {
        try {
            $jwks = $this->getJson($jwksUrl);
            return JWT::decode($token, JWK::parseKeySet($jwks));
        } catch (Throwable) {
            throw new RuntimeException('The provider identity token could not be verified.');
        }
    }

    private function assertJwtClaims(object $claims, array $issuers, string $audience): void
    {
        $issuer = (string) ($claims->iss ?? '');
        $audiences = is_array($claims->aud ?? null) ? $claims->aud : [(string) ($claims->aud ?? '')];
        $authorizedParty = (string) ($claims->azp ?? '');
        if (!in_array($issuer, $issuers, true)
            || !in_array($audience, $audiences, true)
            || (count($audiences) > 1 && $authorizedParty !== '' && $authorizedParty !== $audience)
            || (int) ($claims->exp ?? 0) <= time()
            || (int) ($claims->iat ?? 0) > time() + 60
        ) {
            throw new RuntimeException('The provider identity token is expired or intended for another application.');
        }
    }

    private function getJson(string $url): array
    {
        return $this->requestJson($url, null);
    }

    private function postForm(string $url, array $fields): array
    {
        return $this->requestJson($url, $fields);
    }

    private function requestJson(string $url, ?array $fields): array
    {
        $handle = curl_init($url);
        if ($handle === false) {
            throw new RuntimeException('Unable to initialize provider verification.');
        }
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ];
        if ($fields !== null) {
            $options[CURLOPT_POST] = true;
            $options[CURLOPT_POSTFIELDS] = http_build_query($fields);
            $options[CURLOPT_HTTPHEADER][] = 'Content-Type: application/x-www-form-urlencoded';
        }
        curl_setopt_array($handle, $options);
        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
        curl_close($handle);

        if (!is_string($body) || $status < 200 || $status >= 300) {
            throw new RuntimeException('The identity provider could not verify the supplied credential.');
        }
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('The identity provider returned an invalid response.');
        }
        if (isset($decoded['error'])) {
            throw new RuntimeException('The identity provider rejected the supplied credential.');
        }
        return $decoded;
    }

    private function identity(
        string $provider,
        string $subject,
        ?string $email,
        bool $emailVerified,
        string $fullName,
        string $profileImage,
    ): array {
        if (strlen($subject) > 190) {
            throw new RuntimeException('The provider account identifier is invalid.');
        }
        return [
            'provider' => $provider,
            'subject' => $subject,
            'email' => $email,
            'email_verified' => $emailVerified,
            'full_name' => trim(substr($fullName, 0, 150)),
            'profile_image' => filter_var($profileImage, FILTER_VALIDATE_URL) ? $profileImage : null,
        ];
    }

    private function metaVersion(): string
    {
        $version = $this->env('AUTH_META_GRAPH_API_VERSION', 'v27.0');
        return preg_match('/^v[0-9]+\\.0$/', $version) === 1 ? $version : 'v27.0';
    }

    private function env(string $key, string $default = ''): string
    {
        $value = getenv($key);
        return $value === false ? $default : trim($value);
    }
}
