# Duplikate — SFDC Template Manager

A Chrome extension + backend that gives support engineers a fast, consistent way to
send canned responses inside Salesforce (SFDC). Managers curate templates centrally;
engineers pull published templates into the extension, where `{{PLACEHOLDERS}}` are
resolved from the live SFDC case page and copied to the clipboard.

## Why
SFDC macros are locked down. The team's workaround — a shared Google Doc — lets
templates drift and go stale. Duplikate makes templates managed, versioned, and
consistently formatted.

## Architecture

```
chrome-extension/        Vite + React extension
  src/popup/             Main UI (login, template list, resolve, copy, share)
  src/content/           Content script — scrapes the SFDC case page
  src/utils/resolver.ts  Pure {{PLACEHOLDER}} resolver

backend/                 Django REST Framework + Postgres
  apps/users/            Email-only auth, 7-day JWT, last_seen
  apps/templates/        Template CRUD (managers write, engineers read published)
  apps/sharing/          SharedResponse — immutable snapshot at share time
  config/                Settings (all config via env vars)

docker-compose.yml       Postgres + backend
.env.example             All configuration
```

## Quick start (backend)

```bash
cp .env.example .env          # then edit DJANGO_SECRET_KEY etc.
docker compose up --build     # backend on http://localhost:8000

# create a manager (Django admin login)
docker compose exec backend python manage.py createsuperuser
```

Django admin (the "manager portal") is at http://localhost:8000/admin/.

## Quick start (extension)

```bash
cd chrome-extension
npm install
npm run build                 # outputs to chrome-extension/dist/
```

Then load `chrome-extension/dist/` as an unpacked extension at `chrome://extensions`
(Developer mode → Load unpacked).

## API

| Method | Path                     | Auth      | Notes                                   |
|--------|--------------------------|-----------|-----------------------------------------|
| POST   | `/api/auth/login/`       | none      | `{ "email": "..." }` → JWT, 401 if unknown |
| GET    | `/api/templates/`        | JWT       | Engineers: published only. Managers: all |
| POST   | `/api/templates/`        | JWT (mgr) | Managers only (403 otherwise)           |
| POST   | `/api/shares/`           | JWT       | Create immutable shared response        |

## Tests

```bash
# Backend
cd backend && pytest

# Extension
cd chrome-extension && npm test
```

## Environment variables

See [.env.example](.env.example). Everything is driven by env vars: `DJANGO_SECRET_KEY`,
`DJANGO_DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `SFDC_DOMAIN`.

## Distribution

- **v1:** load unpacked extension in Chrome developer mode.
- **Backend:** Docker Compose locally; deploy to Railway/Render.
- **CI:** GitHub Actions — lint, test, and build the extension zip on merge to `main`.
