# Multi-Service CRM

Multi-service franchise portal with public, partner, and admin web experiences backed by a NestJS API. MongoDB is the primary database. Redis is reserved for expiring sessions and queues.

## Local development

Requirements: Docker Compose, Node.js 20.19+, and pnpm 12.11.2.

```sh
cp .env.example .env
make up-dev
make migrate-dev
```

Open the web app at [http://localhost](http://localhost). The API health endpoint is [http://localhost/api/health](http://localhost/api/health); Mailpit is at [http://localhost:8025](http://localhost:8025), and Mongo Express is at [http://localhost:8081](http://localhost:8081).

The first API start provisions the administrator from `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `.env`. Sign in at `/admin/login` and enroll an authenticator before accessing protected admin pages. Use only local development credentials here; replace all example secrets before deployment.

Useful commands:

```sh
make logs       # follow development service logs
make check      # lint, typecheck, unit tests, build, and Mongo API integration
make e2e        # browser checks against the running local stack
make down       # stop the stack while preserving named data volumes
```

See [docs/PROGRESS.md](docs/PROGRESS.md) for milestone status, verified checks, and remaining work. Read [AGENTS.md](AGENTS.md) before making changes.
