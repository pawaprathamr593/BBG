# Production deployment notes

No cloud provider or live domain is assumed.

Recommended topology: public HTTPS reverse proxy, Angular static build, API path routed to Yii 3/PHP-FPM, private MySQL 8.4 with persistent storage, and platform-managed secrets.

Backend production settings: APP_ENV=prod, APP_DEBUG=false, DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD supplied securely. Restrict database network access to the backend.

Frontend: configure frontend/src/environments/environment.production.ts apiBaseUrl before the production build. Same-origin reverse proxy deployments may use /api. Separate API domains require a full HTTPS API origin and explicit CORS allowlisting.

Terminate TLS at the edge, keep phpMyAdmin/development ports private, configure backups/restore drills/logging/monitoring/rollback, and serve Angular with SPA fallback. The final domain, hosting platform, TLS arrangement, CI/CD provider, and production DB endpoint remain deployment decisions.
