<?php

declare(strict_types=1);

namespace App\Services\Implementations;

use Aws\SesV2\SesV2Client;
use RuntimeException;
use Throwable;

/**
 * Short-lived email OTP delivery and verification for social accounts that
 * do not provide an explicitly verified email address. Challenge data lives
 * only in Redis; no database table or raw OTP is persisted.
 */
final class SocialEmailOtpService
{
    public function request(string $ticket, string $email): array
    {
        $email = strtolower(trim($email));
        if ($ticket === '' || strlen($ticket) > 128 || filter_var($email, FILTER_VALIDATE_EMAIL) === false || strlen($email) > 190) {
            throw new RuntimeException('Enter a valid email address to continue.');
        }
        $redis = $this->redis();
        $key = $this->challengeKey($ticket);
        $cooldownKey = $key . ':cooldown';
        $cooldown = max(30, min(300, (int) $this->env('AUTH_EMAIL_OTP_RESEND_COOLDOWN', '60')));
        if (!$redis->set($cooldownKey, '1', ['nx', 'ex' => $cooldown])) {
            throw new RuntimeException('Please wait before requesting another verification code.');
        }

        $otp = (string) random_int(100000, 999999);
        $ttl = max(120, min(900, (int) $this->env('AUTH_EMAIL_OTP_TTL', '600')));
        $secret = $this->env('AUTH_ACCESS_TOKEN_SECRET');
        if (strlen($secret) < 32) {
            $redis->del($cooldownKey);
            throw new RuntimeException('Email verification is not configured securely on this environment.');
        }
        $challenge = [
            'email' => $email,
            'code_hash' => hash_hmac('sha256', $ticket . ':' . $email . ':' . $otp, $secret),
            'attempts' => 0,
            'created_at' => time(),
        ];
        $redis->setex($key, $ttl, json_encode($challenge, JSON_THROW_ON_ERROR));

        try {
            $this->sendEmail($email, $otp, $ttl);
        } catch (Throwable $exception) {
            $redis->del($key, $cooldownKey);
            throw new RuntimeException('Unable to send the verification email. Please try again later.', 0, $exception);
        }

        return [
            'email' => $this->maskEmail($email),
            'expires_in' => $ttl,
            'resend_after' => $cooldown,
        ];
    }

    public function verify(string $ticket, string $email, string $otp): string
    {
        $email = strtolower(trim($email));
        $otp = trim($otp);
        if ($ticket === '' || strlen($ticket) > 128 || filter_var($email, FILTER_VALIDATE_EMAIL) === false
            || !preg_match('/^[0-9]{6}$/', $otp)
        ) {
            throw new RuntimeException('Enter the six-digit verification code sent to your email.');
        }
        $redis = $this->redis();
        $key = $this->challengeKey($ticket);
        $lockKey = $key . ':verify-lock';
        if (!$redis->set($lockKey, '1', ['nx', 'ex' => 10])) {
            throw new RuntimeException('This verification request is already being processed.');
        }
        try {
            $raw = $redis->get($key);
            if (!is_string($raw)) {
                throw new RuntimeException('The verification code has expired. Request a new code.');
            }
            $challenge = json_decode($raw, true);
            if (!is_array($challenge) || !hash_equals((string) ($challenge['email'] ?? ''), $email)) {
                throw new RuntimeException('The verification request is invalid or expired.');
            }

            $attempts = (int) ($challenge['attempts'] ?? 0);
            $maxAttempts = max(3, min(10, (int) $this->env('AUTH_EMAIL_OTP_MAX_ATTEMPTS', '5')));
            $expected = (string) ($challenge['code_hash'] ?? '');
            $secret = $this->env('AUTH_ACCESS_TOKEN_SECRET');
            $actual = hash_hmac('sha256', $ticket . ':' . $email . ':' . $otp, $secret);
            if ($expected === '' || !hash_equals($expected, $actual)) {
                $attempts++;
                $remaining = max(1, (int) $redis->ttl($key));
                if ($attempts >= $maxAttempts) {
                    $redis->del($key);
                    throw new RuntimeException('Too many incorrect attempts. Request a new verification code.');
                }
                $challenge['attempts'] = $attempts;
                $redis->setex($key, $remaining, json_encode($challenge, JSON_THROW_ON_ERROR));
                throw new RuntimeException('The verification code is incorrect. Please try again.');
            }

            $redis->del($key, $key . ':cooldown');
            return $email;
        } finally {
            $redis->del($lockKey);
        }
    }

    private function sendEmail(string $email, string $otp, int $ttl): void
    {
        $from = $this->env('AWS_SES_FROM_EMAIL');
        if ($from === '' || filter_var($from, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('AWS_SES_FROM_EMAIL is not configured.');
        }
        $region = $this->env('AWS_SES_REGION', $this->env('AWS_DEFAULT_REGION', 'ap-south-1'));
        $client = new SesV2Client([
            'version' => 'latest',
            'region' => $region,
        ]);
        $client->sendEmail([
            'FromEmailAddress' => $from,
            'Destination' => ['ToAddresses' => [$email]],
            'Content' => [
                'Simple' => [
                    'Subject' => ['Data' => 'Your BBG verification code', 'Charset' => 'UTF-8'],
                    'Body' => [
                        'Text' => [
                            'Data' => "Your BBG verification code is {$otp}. It expires in " . (int) ceil($ttl / 60) . " minutes. If you did not request this code, you can ignore this email.",
                            'Charset' => 'UTF-8',
                        ],
                    ],
                ],
            ],
        ]);
    }

    private function redis(): \Redis
    {
        if (!class_exists(\Redis::class)) throw new RuntimeException('Redis PHP extension is not installed.');
        $redis = new \Redis();
        if (!$redis->connect($this->env('REDIS_HOST', 'redis'), (int) $this->env('REDIS_PORT', '6379'), 2.0)) {
            throw new RuntimeException('Unable to connect to the BBG authentication cache.');
        }
        $password = $this->env('REDIS_PASSWORD');
        if ($password !== '' && !$redis->auth($password)) throw new RuntimeException('Unable to authenticate with the BBG authentication cache.');
        return $redis;
    }

    private function challengeKey(string $ticket): string
    {
        return 'bbg:oauth:email-otp:' . hash('sha256', $ticket);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);
        $visible = mb_substr($local, 0, 1);
        return $visible . str_repeat('*', max(2, mb_strlen($local) - 1)) . '@' . $domain;
    }

    private function env(string $key, string $default = ''): string
    {
        $value = getenv($key);
        return $value === false ? $default : trim($value);
    }
}
