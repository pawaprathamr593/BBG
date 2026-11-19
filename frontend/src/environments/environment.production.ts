export const environment = {
  production: true,
  appName: 'BBG',
  // Same-origin reverse proxy serves the API under /api/v1.
  apiBaseUrl: '',
  s3UploadHost: 'bbg-839544975641-ap-south-1-an.s3.ap-south-1.amazonaws.com',
} as const;
