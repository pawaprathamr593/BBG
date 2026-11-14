# BBG — Business Management & Marketplace Platform

Yii 3 API backend, Angular 22 frontend, MySQL 8.4, Nginx/PHP-FPM, and Docker Compose for local development.

## Local setup
1. Copy .env.example to .env and replace placeholder passwords.
2. Start Docker Desktop.
3. Run `./bbg rebuild` once to build the PHP 8.4 image with the Redis extension, then run `./bbg deps`.
4. Local URLs: API http://localhost:8080, Angular http://localhost:4200, phpMyAdmin http://localhost:8081.
5. Redis is available to backend containers at `redis:6379` on the private Compose network; its OTP challenge data is memory-only and is not published to the host.  
6. Run `./bbg help` for available commands.

The existing external MySQL volume `dark-store_mysql_data` and PHP image tag `bbc-php:8.4` are intentionally preserved to protect the working local setup. The PHP image is now built from `docker/php/Dockerfile` and includes `php8.4-redis`.

## Configuration
Root .env configures local Compose, Redis, OAuth provider credentials and Amazon SES sender settings. backend/.env.example documents backend variables. Angular development and production API URLs are configured separately in src/environments/environment.ts and environment.production.ts. Production secrets must be injected by the hosting platform and never committed. See [Social Authentication Setup](backend/docs/social-authentication-setup.md) for provider console setup, exact callback URLs, SES requirements and production security settings.

The production API path defaults to /api for same-origin reverse-proxy routing. If the API is hosted separately, configure a full HTTPS API origin and an explicit CORS allowlist.

## Architecture and data safety
The backend follows the seven documented layers: InDto, Controller, Versioned Services, Core Services, DAO, Model, Utils. See backend/src/Architecture/README.md. The supplied BBG database design remains authoritative: preserve its table names, types, logical relationships, five common audit columns, and A/Z soft-delete convention. Redis is provided as an internal, non-persistent service for short-lived OAuth state and email OTP challenges; no Redis port is published to the host. Google, Apple, Facebook and Instagram professional-account OAuth callbacks, verified-email account linking through USER_IDENTITIES, and Redis-backed email OTP verification are implemented. Provider credentials and SES sender configuration are environment-dependent. No new database tables or migrations are required.

## Production checklist
Set APP_ENV=prod and APP_DEBUG=false; inject database credentials/secrets securely; terminate TLS; configure the production API URL; keep phpMyAdmin and development ports private; configure persistent MySQL storage, backups, monitoring, rollback, Angular SPA fallback, and API reverse proxying. Hosting provider, live domain, TLS topology, CI/CD, and production DB endpoint remain undecided.
