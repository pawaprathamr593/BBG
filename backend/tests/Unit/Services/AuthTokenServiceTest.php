<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Utils\AuthTokenService;
use Codeception\Test\Unit;

final class AuthTokenServiceTest extends Unit
{
    protected function setUp(): void
    {
        parent::setUp();
        putenv('AUTH_ACCESS_TOKEN_SECRET=' . str_repeat('a', 64));
        putenv('AUTH_TOKEN_ISSUER=bbg-test');
        putenv('AUTH_TOKEN_AUDIENCE=bbg-test-client');
    }

    protected function tearDown(): void
    {
        putenv('AUTH_ACCESS_TOKEN_SECRET');
        putenv('AUTH_TOKEN_ISSUER');
        putenv('AUTH_TOKEN_AUDIENCE');
        parent::tearDown();
    }

    public function testIssuedAccessTokenCanBeVerified(): void
    {
        $service = new AuthTokenService();
        $token = $service->issueAccessToken(42, 'session-uuid');

        $claims = $service->verifyAccessToken($token);

        self::assertNotNull($claims);
        self::assertSame('42', $claims['sub']);
        self::assertSame('session-uuid', $claims['sid']);
    }

    public function testTamperedAccessTokenIsRejected(): void
    {
        $service = new AuthTokenService();
        $token = $service->issueAccessToken(42, 'session-uuid');
        $tampered = substr($token, 0, -1) . (str_ends_with($token, 'a') ? 'b' : 'a');

        self::assertNull($service->verifyAccessToken($tampered));
    }

    public function testRefreshTokensAreStoredAsOneWayHashes(): void
    {
        $service = new AuthTokenService();
        $token = $service->generateRefreshToken();

        self::assertNotSame($token, $service->hashRefreshToken($token));
        self::assertSame(64, strlen($service->hashRefreshToken($token)));
    }
}
