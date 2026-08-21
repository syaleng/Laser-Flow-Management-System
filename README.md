# LaserFlow Management System

LaserFlow is a web-based workflow and financial management system designed specifically for laser-cutting shops. Phase 1 provides the secure application foundation: PostgreSQL-backed Django REST APIs, email-based users and roles, JWT authentication, and a protected React application shell.

## Architecture

```text
React SPA → Nginx → Django REST API → PostgreSQL
```

The backend is a modular Django monolith. Business modules will be isolated as Django apps with service and selector layers. The frontend is organized by business feature. This keeps deployment simple while preserving clear domain boundaries.

## Phase 1 features

- Django 5.2 LTS and Django REST Framework
- PostgreSQL-only development/production configuration
- UUID custom user model with `OWNER`, `MANAGER`, `OPERATOR`, and `VIEWER` roles
- 15-minute JWT access tokens and rotating, blacklisted 7-day refresh tokens
- HTTP-only refresh cookies; access tokens stay in frontend memory
- Owner-controlled user API and Django administration
- React 19, TypeScript, Vite, Tailwind CSS 4, React Router, and TanStack Query
- Responsive protected navigation and dashboard shell
- OpenAPI schema, Swagger UI, health check, uniform API errors, and pagination
- Containerized development and production definitions

## Repository structure

```text
backend/           Django API, domain apps, migrations, and tests
frontend/          React SPA, feature modules, UI, and tests
deploy/            Production reverse-proxy configuration
compose.yaml       Development containers
compose.prod.yaml  Production-oriented containers
```

## Environment configuration

Copy `.env.example` to `.env` and replace every placeholder secret. Generate independent Django and JWT keys; never commit `.env`.

For local non-container development, change `POSTGRES_HOST` and `DATABASE_URL` from `db` to `localhost`. The application timezone is `Asia/Kabul`; financial currency will be AFN in the business modules.

## Docker development

Docker Desktop is required but was not installed on the workstation during Phase 1 verification.

```shell
docker compose up --build
docker compose exec backend python manage.py createsuperuser
```

Open the application at `http://localhost:5173`, API documentation at `http://localhost:8000/api/v1/docs/`, and the health check at `http://localhost:8000/health/`.

The backend container applies migrations and collects static assets on startup. In controlled production environments, migrations may instead run as a separate release job.

## Native development

Install PostgreSQL, create the configured database/user, and update `.env` to use `localhost`.

Backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e "backend[dev]"
Set-Location backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Frontend:

```powershell
npm --prefix frontend ci
npm run dev
```

The root npm scripts delegate to the frontend package. Running from inside
`frontend/` is also supported with the usual `npm run dev` command.

## Phase 1 API

```text
POST   /api/v1/auth/login/
POST   /api/v1/auth/token/refresh/
POST   /api/v1/auth/logout/
GET    /api/v1/auth/me/
POST   /api/v1/auth/change-password/
GET    /api/v1/users/
POST   /api/v1/users/
GET    /api/v1/users/{id}/
PATCH  /api/v1/users/{id}/
POST   /api/v1/users/{id}/activate/
POST   /api/v1/users/{id}/deactivate/
GET    /api/v1/schema/
GET    /api/v1/docs/
GET    /health/
```

Phase 2A customer API:

```text
GET    /api/v1/customers/
POST   /api/v1/customers/
GET    /api/v1/customers/{id}/
PATCH  /api/v1/customers/{id}/
POST   /api/v1/customers/{id}/archive/
POST   /api/v1/customers/{id}/restore/
```

Customer lists support search, active/archive status, WhatsApp consent, ordering,
and pagination. Customer records are archived rather than deleted.

Only owners may access user-management endpoints. Role authorization uses named business capabilities rather than direct role checks, allowing future modules to enforce the same policies consistently.

| Capability | Owner | Manager | Operator | Viewer |
|---|---:|---:|---:|---:|
| Manage users | Yes | No | No | No |
| Manage customers | Yes | Yes | Yes | No |
| Create laser jobs | Yes | Yes | Yes | No |
| Manage payments | Yes | Yes | No | No |
| Manage expenses | Yes | Yes | No | No |
| View reports | Yes | Yes | No | Yes |

## Quality commands

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m pytest
..\.venv\Scripts\ruff.exe check apps config tests
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings.test

Set-Location ..\frontend
npm run lint
npm run test
npm run build
```

## Production deployment

1. Provision a Linux host with Docker, DNS, and TLS certificates.
2. Put `fullchain.pem` and `privkey.pem` in `deploy/certs/`, or replace the proxy certificate setup with a managed ingress.
3. Configure `.env` with strong independent keys, production hostname/origins, and a strong PostgreSQL password.
4. Build and start the services.

```shell
docker compose -f compose.prod.yaml up -d --build
docker compose -f compose.prod.yaml exec backend python manage.py createsuperuser
docker compose -f compose.prod.yaml exec backend python manage.py check --deploy
```

Production should use a managed database and object storage when available. Application containers should run behind a cloud load balancer or managed ingress in larger deployments.

## PostgreSQL backup strategy

- Take an encrypted automated backup every day.
- Retain daily backups for 14 days, weekly backups for 8 weeks, and monthly backups for 12 months.
- Store copies outside the application host and restrict access to the owner/administrator.
- Perform a documented restore test at least quarterly; an untested backup is not considered valid.
- Take a manual backup immediately before schema migrations or major releases.

Example logical backup and restore:

```shell
docker compose -f compose.prod.yaml exec -T db pg_dump -U laserflow -Fc laserflow > laserflow.dump
docker compose -f compose.prod.yaml exec -T db pg_restore -U laserflow -d laserflow --clean --if-exists < laserflow.dump
```

Test restoration against a separate database first. Never run `--clean` against the live database without an approved recovery procedure.

## Next phase

Phase 2 adds customers, laser jobs, payments, expenses, and derived debt calculations. Placeholder navigation exists for these modules, but no business totals are fabricated during Phase 1.
