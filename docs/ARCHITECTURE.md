# Architecture and engineering conventions

> Source: _Multi-Service Franchise CRM: Product & Engineering Roadmap_ (44 pages). This repository copy is the working specification.

The implemented stack is Next.js App Router, NestJS on `@nestjs/platform-express`, MongoDB replica set with Mongoose and migrate-mongo, BullMQ on Redis, and RustFS for local S3-compatible storage. See [DECISIONS.md](DECISIONS.md). The M1 email outbox is stored in MongoDB and processed by the worker with retry/backoff. See [QUESTIONS.md](QUESTIONS.md) for remaining owner questions.

## Source page 12

Invoices: a tax invoice is generated per completed order, numbered in sequence by
financial year, as a PDF stored with the order. Plan invoices use the same numbering
service. 6. Architecture and containers
The API is a modular monolith: one codebase with strict module boundaries (identity,
partners, billing, wallet, catalogue, orders, crm, commissions, support, content, reports,
settings). The web container never talks to the database; it only calls the API. The worker
runs the same code as the API with a different start command. Phase B adapters (section 13) live inside the API as disabled modules behind one interface.
6.1 Containers
container architecture · 7 containers
Container Image and command Port
(internal)
Volume Notes
proxy Caddy 2 80, 443
(public)
caddy_data Automatic HTTPS; /api
to api, everything else
to web

## Source page 13

Development adds Mailpit (catches outgoing email), Mongo Express (MongoDB viewer), and hot reload.
One docker compose up must start a working system with seeded demo data.
6.2 Technology choices
Container Image and command Port
(internal)
Volume Notes
web Next.js standalone Node server
3000 none Stateless; App Router server
api Node LTS, NestJS on
@nestjs/platform-express 4000 none Health endpoint
/api/health ;
migrations run as a
separate one-off
command
worker Same image as api ,
command worker
none none Queue processors,
scheduled jobs, nightly
backup
db MongoDB, current
supported major,
started as a one-node
replica set
27017 mongodata Replica set is required
for transactions; never
exposed publicly
redis Redis 7 6379 redisdata Sessions and queues;
never exposed publicly
storage RustFS 9000 miniodata Private buckets: kyc ,
orders , invoices ,
content
Concern Choice
Repo pnpm workspaces with Turborepo, TypeScript
strict mode
Web Next.js App Router, React, TypeScript; shared Zod
contracts and app-local CSS (see DECISIONS.md for
the installed/missing UI library audit)
API NestJS on @nestjs/platform-express, shared Zod
schemas, Mongoose models, migrate-mongo for
schema and data migrations

## Source page 14

6.3 Environment variables (all listed in .env.example )
Concern Choice
Database MongoDB as a replica set; transactions on every
money-changing operation; JSON-schema
validators on critical collections
Queue and cron BullMQ on Redis
Auth argon2 password hashing, TOTP with otplib ,
server-side sessions in Redis, CSRF protection
Files S3 client against private S3-compatible storage, antivirus
scan hook (stub in release 1)
PDFs pdfmake for invoices, credit notes and statements
Email Nodemailer over SMTP, templates stored in the
database and editable in settings
Tests Node built-in test/assert (unit), Supertest (API) against a throwaway
MongoDB replica set, Playwright (end to end)
Quality ESLint, Prettier, tsc --noEmit , commit hooks,
GitHub Actions or equivalent CI
Variable Purpose
APP_BASE_URL Public URL, used in emails and links
DATABASE_URL , REDIS_URL Connections
S3_ENDPOINT , S3_ACCESS_KEY ,
S3_SECRET_KEY , S3_REGION
Object storage
SESSION_SECRET Signs session cookies
FIELD_ENCRYPTION_KEY Encrypts sensitive columns (bank account,
ID numbers)
SMTP_URL , MAIL_FROM Outgoing email
ADMIN_BOOTSTRAP_EMAIL ,
ADMIN_BOOTSTRAP_PASSWORD
Creates the first super admin on first start
only
TZ Asia/Kolkata for display; storage stays
UTC

## Source page 15

6.4 Environments
Local: docker compose up with seed data.
Staging: same compose file with a production-like override; used for every gate demo
and acceptance test.
Production: same images, secrets from the host's secret store, nightly encrypted
backups of the database and storage volumes to a second location, and a documented
restore drill. 7. Repository structure and conventions
Codex should create exactly this layout in task M0-01 and keep to it. A predictable layout
is what lets it find the right file without re-reading the whole project.
/
AGENTS.md rules and commands for Codex
docker-compose.yml base services
docker-compose.dev.yml Mailpit, Mongo Express, hot reload
docker-compose.prod.yml production overrides
.env.example every variable, dummy values
Makefile make up, make test, make check, make seed, make
migrate
docs/ SPEC, ARCHITECTURE, DATA_MODEL, API, MILESTONES,
PROGRESS, DECISIONS, QUESTIONS
apps/
web/ Next.js App Router
src/app/ public, partner and admin route groups
src/components/ shared UI and domain components
src/components/ui/ base components
src/components/domain/ order table, wallet card, form renderer
src/lib/ api client, auth helpers, formatters
src/messages/en.json all user-facing text
api/ NestJS modules
migrations/ migrate-mongo scripts
src/common/ middleware, permission guard, errors, pagination,
money, scoping
src/modules/ identity, partners, billing, wallet, catalogue,
orders,
crm, commissions, support, content, reports,
Variable Purpose
LOG_LEVEL , NODE_ENV Runtime

## Source page 16

settings,
notifications, files, audit, tools
src/adapters/ Phase B interfaces and disabled stubs
src/seed/ seed data and catalogue import
src/main.ts NestJS API entry
src/worker.ts worker entry
packages/
shared/ Zod schemas, types, permission keys, status
enums, money helpers
config/ eslint, tsconfig, prettier presets
e2e/ Playwright tests, one folder per milestone
ops/ Caddyfile, backup and restore
scripts, runbook.md
Inside every API module: *.controller.ts , *.service.ts , *.repository.ts , dto/
(Zod), *.spec.ts , README.md .
7.1 Coding conventions
Topic Rule
Layers Route handler does HTTP and permission only;
service holds business rules; repository is the only
code that touches Mongoose models. Each module
also has its *.model.ts
Permissions `@RequirePermission('orders.create')` decorator
and guard on every route; a test scans routes and fails
if any route lacks a permission declaration
Data scoping Repositories take an Actor and apply
scopeToActor(actor); admin-only bypasses are explicit
and permission-guarded; a static test fails the build
if a repository query lacks scope or documented bypass
Money Money helper over integer paise; formatting only in
the web layer; never number arithmetic on rupees
IDs and time MongoDB ObjectId for _id ; Date values in UTC
Validation Every request and response body has a Zod
schema in packages/shared ; the web uses the
same schema; critical collections also carry a
MongoDB JSON-schema validator
