# BBC Command-Line Manager

A lightweight macOS shell wrapper for the existing BBC Docker Compose project.

## Safety notes

- The database volume is expected to remain `dark-store_mysql_data`.
- The Compose file must declare it as an external volume:
  ```yaml
  volumes:
    mysql_data:
      external: true
      name: dark-store_mysql_data
  ```
- `./bbc stop` stops containers but does not remove them or their data.
- `./bbc down` and `docker compose down -v` are intentionally not provided.
- `./bbc restore` overwrites data in the configured database and requires typing `RESTORE`.
- Backups are written to `./backups/`. Keep this folder out of Git.

## Install

From the project root (the folder containing `docker-compose.yml`):

```bash
mkdir -p scripts backups
# Copy the supplied `bbc` file into the project root.
chmod +x bbc
```

Add this to `.gitignore`:

```gitignore
/backups/
*.sql
*.sql.gz
```

Check the external volume declaration in `docker-compose.yml`, then validate:

```bash
docker compose config --quiet
docker volume inspect dark-store_mysql_data
```

Start Docker Desktop and the stack:

```bash
open -a Docker
./bbc start
./bbc health
```

## Commands

| Command | Purpose |
|---|---|
| `./bbc start` | Start all services |
| `./bbc stop` | Stop all services without deleting containers or volumes |
| `./bbc restart` | Restart all services |
| `./bbc status` | Show Compose service status |
| `./bbc logs [service]` | Follow logs; optionally limit to a service |
| `./bbc rebuild` | Build and recreate services |
| `./bbc php` | Open shell in PHP container |
| `./bbc frontend` | Open shell in Angular container |
| `./bbc mysql` | Open shell in MySQL container |
| `./bbc backup` | Create timestamped compressed MySQL dump |
| `./bbc restore <file>` | Restore a `.sql` or `.sql.gz` backup (confirmation required) |
| `./bbc health` | Check HTTP endpoints and MySQL |
| `./bbc deps` | Run Composer install and npm ci |
| `./bbc deps php` | Run Composer install only |
| `./bbc deps frontend` | Run npm ci only |
| `./bbc git <args>` | Run Git from the project root |
| `./bbc yii <args>` | Run the Yii console entrypoint |

## Expected service URLs

- Backend/Nginx: http://localhost:8080
- Angular: http://localhost:4200
- phpMyAdmin: http://localhost:8081

## Notes about this project

Based on the currently shared Compose configuration:
- Services: `php`, `nginx`, `mysql`, `phpmyadmin`, `frontend`
- PHP image: `bbc-php:8.4`
- MySQL image: `mysql:8.4`
- Nginx image: `nginx:stable`
- Frontend image: `node:26-bookworm-slim`
- Database name shown in the existing environment: `dark_store`

The helper assumes the PHP container includes Composer and that the Yii console entrypoint is `backend/yii`. If either differs, use the targeted command shown by the script's error or adjust that command after checking the actual backend files.

## First-run verification

```bash
./bbc status
./bbc health
./bbc backup
./bbc git status
./bbc yii help
```

If `./bbc yii help` reports that `backend/yii` is missing, inspect the backend root and identify the Yii 3 console entrypoint before using the Yii wrapper.
