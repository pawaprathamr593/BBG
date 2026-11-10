# BBG — Business Management & Marketplace Platform

Yii 3 API backend, Angular 22 frontend, MySQL 8.4, Nginx/PHP-FPM, and Docker Compose for local development.

## Local setup
1. Copy .env.example to .env and replace placeholder passwords.
2. Start Docker Desktop.
3. Run ./bbg start and ./bbg deps.
4. Local URLs: API http://localhost:8080, Angular http://localhost:4200, phpMyAdmin http://localhost:8081.
5. Run ./bbg help for available commands.

The existing external MySQL volume dark-store_mysql_data and PHP image tag bbc-php:8.4 are intentionally preserved to protect the working local setup.

## Configuration
Root .env configures local Compose. backend/.env.example documents backend variables. Angular development and production API URLs are configured separately in src/environments/environment.ts and environment.production.ts. Production secrets must be injected by the hosting platform and never committed.

The production API path defaults to /api for same-origin reverse-proxy routing. If the API is hosted separately, configure a full HTTPS API origin and an explicit CORS allowlist.

## Architecture and data safety
The backend follows the seven documented layers: InDto, Controller, Versioned Services, Core Services, DAO, Model, Utils. See backend/src/Architecture/README.md. The supplied BBG database design remains authoritative: preserve its table names, types, logical relationships, five common audit columns, and A/Z soft-delete convention. This foundation change does not create tables or run migrations.

## Production checklist
Set APP_ENV=prod and APP_DEBUG=false; inject database credentials/secrets securely; terminate TLS; configure the production API URL; keep phpMyAdmin and development ports private; configure persistent MySQL storage, backups, monitoring, rollback, Angular SPA fallback, and API reverse proxying. Hosting provider, live domain, TLS topology, CI/CD, and production DB endpoint remain undecided.
