# BBG API v1 — Subscription proof upload

**Status:** Implemented on `fix/bbg-seven-layer-audit`  
**Storage:** AWS S3 using presigned PUT URLs  
**Allowed files:** JPEG, PNG, WebP and PDF

## 1. Request an upload URL

`POST /api/v1/subscriptions/proofs/upload-url`

The endpoint uses the existing `subscriptionParam` request envelope. The controller derives `actionType=generateSubscriptionProofUploadUrl` from the matched route and injects the bearer access token from the Authorization header.

Example request body:

```json
{
  "subscriptionParam": {
    "actionData": {
      "tenant_id": 123,
      "subscription_id": 456,
      "original_file_name": "payment-receipt.pdf",
      "mime_type": "application/pdf",
      "file_size_bytes": 184320
    }
  }
}
```

Required headers:
- `Authorization: Bearer <access-token>`
- `Content-Type: application/json`

The authenticated user must have valid tenant context and the subscription must belong to that tenant. Upload URLs are issued only when the subscription status is `PENDING` or `REJECTED`.

Example success response:

```json
{
  "status": "SUCCESS",
  "msgArr": [],
  "data": {
    "upload_url": "<presigned-s3-put-url>",
    "object_key": "tenants/123/subscription-proofs/<32-hex-character-id>.pdf",
    "method": "PUT",
    "headers": {
      "Content-Type": "application/pdf"
    },
    "expires_in": 600
  }
}
```

The presigned URL lifetime is controlled by `AWS_S3_URL_TTL_MINUTES` (default 10 minutes). The maximum declared upload size is controlled by `AWS_S3_MAX_UPLOAD_BYTES` (default 10 MiB).

## 2. Upload the file to S3

The client uploads the raw file bytes directly to the returned `upload_url` using HTTP PUT and the exact `Content-Type` header returned in the response. Do not send the file through the BBG API server.

## 3. Submit the uploaded proof

`POST /api/v1/subscriptions/proofs/submit`

Example request body:

```json
{
  "subscriptionParam": {
    "actionData": {
      "tenant_id": 123,
      "subscription_id": 456,
      "proof_file_path": "tenants/123/subscription-proofs/<32-hex-character-id>.pdf",
      "payment_reference": "UPI-REFERENCE-OPTIONAL"
    }
  }
}
```

The controller injects the bearer access token and derives `actionType=submitSubscriptionProof` from the route.

Before storing proof metadata, Core Services:
- Requires the exact tenant-scoped key format issued by the upload-URL operation.
- Verifies that the S3 object exists.
- Checks actual Content-Type, file signature and file extension consistency.
- Checks actual object size is greater than zero and does not exceed the configured S3 maximum.
- Rejects objects that fail verification.

The client-provided MIME type and size are used only to request an upload URL; the final submission is checked against the actual S3 object metadata and bytes.

## 4. Security and operational notes

- The upload key is generated server-side with 128 bits of random key material and is scoped to the tenant.
- The client cannot select another tenant's object key by supplying an arbitrary path.
- A successful upload-URL response does not mean the proof was submitted or approved. The client must upload to S3 and then call the submit endpoint.
- S3 credentials remain server-side in environment configuration. Never commit real credentials.
- Live S3 upload and download verification still requires a configured bucket, IAM permissions, credentials and end-to-end testing.
