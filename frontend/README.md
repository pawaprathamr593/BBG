# BBG Frontend

Angular 22 application for the BBG Business Management & Marketplace Platform.

## Requirements

- Node.js 22
- npm compatible with the committed lockfile (the repository uses npm 11)

## Local development

1. Start the Yii 3 API so it is reachable at `http://localhost:8080`.
2. From this directory, install dependencies and start Angular:

```bash
npm ci
npm start
```

3. Open `http://localhost:4200/`.

The development environment uses a relative API base URL. Angular's development server reads `proxy.conf.json` and forwards requests matching `/api/**` to `http://localhost:8080`. Keep the API base URL relative in `src/environments/environment.ts`; do not hard-code the backend origin there. This keeps browser API requests same-origin and avoids local CORS preflight failures without changing endpoint paths, methods, request envelopes, cookies or CSRF headers.

If the backend uses another local port, update the proxy target. The proxy is for `ng serve` only. The production environment also uses relative API paths and expects the deployment web server/reverse proxy to forward `/api` to Yii. If a deployment deliberately uses different origins, configure credentialed CORS in the backend with an explicit allowed origin; wildcard origins are incompatible with credentialed refresh-cookie requests.

## Build

```bash
npm run build
```

The default build is the production build. Output is written under `dist/`.

## Unit tests

Run tests in watch mode:

```bash
npm test
```

Run once, as CI does:

```bash
npm test -- --watch=false
```

## Sitemap

```bash
npm run generate:sitemap
```

The sitemap generator requires the public origin and API configuration documented in `docs/frontend-implementation-notes.md`.

## Validation tooling

The repository currently defines build, unit-test and sitemap scripts. It does not yet define an npm lint script or an end-to-end test runner; do not use `ng e2e` until an E2E framework and configuration are added.
