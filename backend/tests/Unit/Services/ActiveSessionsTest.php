<?php

declare(strict_types=1);

namespace App\Tests\Unit\Services;

use App\Dao\AuthDao;
use App\Services\Implementations\AuthServices;
use App\Utils\AuthTokenService;
use App\Utils\SocialProviderTokenVerifier;
use Codeception\Test\Unit;
use Psr\Log\NullLogger;
use ReflectionClass;
use Yiisoft\Db\Connection\ConnectionInterface;

final class ActiveSessionsTest extends Unit
{
    private AuthServices $service;
    private $reflectionMethod;

    protected function setUp(): void
    {
        parent::setUp();
        $refAuthServices = new ReflectionClass(AuthServices::class);
        $this->service = $refAuthServices->newInstanceWithoutConstructor();

        $this->reflectionMethod = $refAuthServices->getMethod('parseUserAgentMetadata');
        $this->reflectionMethod->setAccessible(true);
    }

    private function parseUA(?string $ua, ?string $deviceName, ?string $ip): array
    {
        return $this->reflectionMethod->invoke($this->service, $ua, $deviceName, $ip);
    }

    public function testMacChromeDetection(): void
    {
        $ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        $meta = $this->parseUA($ua, null, '192.168.1.50');

        self::assertSame('macOS', $meta['os']);
        self::assertSame('Google Chrome', $meta['browser']);
        self::assertSame('desktop', $meta['device_type']);
        self::assertSame('Mac', $meta['device_name']);
        self::assertTrue($meta['is_internal_ip']);
    }

    public function testWindowsEdgeDetection(): void
    {
        $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
        $meta = $this->parseUA($ua, 'Work PC', '8.8.8.8');

        self::assertSame('Windows', $meta['os']);
        self::assertSame('Microsoft Edge', $meta['browser']);
        self::assertSame('desktop', $meta['device_type']);
        self::assertSame('Work PC', $meta['device_name']);
        self::assertFalse($meta['is_internal_ip']);
    }

    public function testIPhoneSafariDetection(): void
    {
        $ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
        $meta = $this->parseUA($ua, null, '10.0.0.12');

        self::assertSame('iOS', $meta['os']);
        self::assertSame('Apple Safari', $meta['browser']);
        self::assertSame('mobile', $meta['device_type']);
        self::assertSame('iPhone', $meta['device_name']);
        self::assertTrue($meta['is_internal_ip']);
    }

    public function testAndroidTabletDetection(): void
    {
        $ua = 'Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
        $meta = $this->parseUA($ua, null, '172.20.0.5');

        self::assertSame('Android', $meta['os']);
        self::assertSame('Google Chrome', $meta['browser']);
        self::assertSame('tablet', $meta['device_type']);
        self::assertSame('Android Tablet', $meta['device_name']);
        self::assertTrue($meta['is_internal_ip']);
    }
}
