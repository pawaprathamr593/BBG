export const environment = {
  production: false,
  appName: 'BBG',
  // Keep browser requests same-origin; ng serve proxies /api/** to the Yii API.
  apiBaseUrl: '',
} as const;
