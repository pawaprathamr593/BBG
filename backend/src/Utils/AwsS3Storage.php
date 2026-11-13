<?php

declare(strict_types=1);

namespace App\Utils;

use Aws\Exception\AwsException;
use Aws\S3\S3Client;
use RuntimeException;

/**
 * Server-side S3 adapter. Credentials are resolved by the AWS SDK default
 * credential provider chain (environment variables / workload IAM role).
 */
final class AwsS3Storage
{
    private ?S3Client $client = null;
    private string $bucket;
    private int $urlTtlMinutes;
    private string $region;

    public function __construct()
    {
        $this->bucket = trim((string) getenv('AWS_S3_BUCKET'));
        $region = trim((string) (getenv('AWS_DEFAULT_REGION') ?: 'ap-south-1'));
        $this->urlTtlMinutes = max(1, min(60, (int) (getenv('AWS_S3_URL_TTL_MINUTES') ?: 10)));

        $this->region = $region;
    }

    public function createUploadUrl(string $key, string $contentType): array
    {
        try {
            $command = $this->client()->getCommand('PutObject', [
                'Bucket' => $this->bucket,
                'Key' => $key,
                'ContentType' => $contentType,
            ]);
            $request = $this->client()->createPresignedRequest(
                $command,
                '+' . $this->urlTtlMinutes . ' minutes',
            );

            return [
                'url' => (string) $request->getUri(),
                'expires_in' => $this->urlTtlMinutes * 60,
            ];
        } catch (AwsException $exception) {
            throw new RuntimeException('Unable to create S3 upload URL.', 0, $exception);
        }
    }

    public function createDownloadUrl(string $key): string
    {
        try {
            $command = $this->client()->getCommand('GetObject', [
                'Bucket' => $this->bucket,
                'Key' => $key,
            ]);
            return (string) $this->client()->createPresignedRequest(
                $command,
                '+' . $this->urlTtlMinutes . ' minutes',
            )->getUri();
        } catch (AwsException $exception) {
            throw new RuntimeException('Unable to create S3 download URL.', 0, $exception);
        }
    }

    public function headObject(string $key): array
    {
        try {
            return $this->client()->headObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
            ])->toArray();
        } catch (AwsException $exception) {
            throw new RuntimeException('Unable to verify uploaded S3 object.', 0, $exception);
        }
    }

    public function deleteObject(string $key): void
    {
        try {
            $this->client()->deleteObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
            ]);
        } catch (AwsException $exception) {
            throw new RuntimeException('Unable to delete S3 object.', 0, $exception);
        }
    }

    private function client(): S3Client
    {
        if ($this->bucket === '') {
            throw new RuntimeException('AWS S3 bucket configuration is missing.');
        }
        if ($this->client === null) {
            $this->client = new S3Client([
                'version' => 'latest',
                'region' => $this->region,
            ]);
        }
        return $this->client;
    }

    public function getMaxUploadBytes(): int
    {
        return max(1024, (int) (getenv('AWS_S3_MAX_UPLOAD_BYTES') ?: 10485760));
    }
}
