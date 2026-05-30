<div align="center">

# PulseBoard

**Real-time API health monitoring & incident command center.**

Open-source uptime monitoring, WebSocket health checks, security scanning, incident management, and branded status pages — for developers and small teams who want visibility without enterprise weight.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E.svg?logo=nestjs&logoColor=white)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=white)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748.svg?logo=prisma&logoColor=white)](https://prisma.io)

[Quick start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [API](#-rest-api) · [Configuration](#-configuration) · [Deployment](#-deployment)

</div>

---

## Table of contents

- [What is PulseBoard?](#what-is-pulseboard)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [Architecture](#-architecture)
- [Quick start](#-quick-start)
- [Project structure](#-project-structure)
- [Configuration](#-configuration)
- [Monitor types](#-monitor-types)
- [WebSocket security scanner](#-websocket-security-scanner)
- [Alerting](#-alerting)
- [Status pages](#-status-pages)
- [API keys](#-api-keys)
- [REST API](#-rest-api)
- [Realtime events](#-realtime-events)
- [Database schema](#-database-schema)
- [Development scripts](#-development-scripts)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## What is PulseBoard?

PulseBoard watches your APIs and WebSocket services on an interval, detects when things break, opens incidents, fans out alerts to the channels your team already uses, and publishes a public status page. It runs as a single Node monorepo (NestJS API + React frontend), persists to SQLite or Postgres via Prisma, uses Redis for scheduler leader election, and pushes live updates over Socket.IO.

It is intentionally small. There are no agents to deploy, no per-host pricing, no SaaS lock-in. Self-host it on a $5 box, or run the cloud version. Either way, it's the same code.

## ✨ Features

| Capability | What it does |
|---|---|
| **HTTP monitoring** | Polls REST endpoints; tracks response time, status code, and JSON-path assertions. Configurable intervals, timeouts, retries, and failure thresholds. |
| **WebSocket monitoring** | Verifies real-time channels end-to-end — connection, auth handshake, subscription, expected response. Catches what HTTP checks miss. |
| **WebSocket security scanner** | Safe, OWASP-style checks: transport (wss), auth requirement, origin handling, query-token leaks, rate limits, schema validation, payload size, error leakage. Bounded by message and duration caps. |
| **Incident management** | Auto-opens incidents on consecutive failures. Timeline of updates (notes, status changes, root-cause), severity levels (low → critical), assignment, public-summary field, resolve and close. |
| **Smart alerting** | Email, Slack, Discord, and webhook channels with templates and built-in setup guides. Policies match on event + severity, with per-policy cooldown and dedup. Test send from the UI. |
| **Public status pages** | Branded pages at `/status/<slug>` — overall status, component health, active and recent incidents, accent color, intro text. Auto-refreshes every 30s. |
| **Real-time dashboard** | Live monitor/incident updates over Socket.IO. Online indicator in the top bar, no page refresh needed. |
| **Multi-workspace** | One account, many workspaces. Workspace-scoped services, monitors, incidents, alerts, status pages, audit log. Member roles: owner / admin / member. |
| **API keys** | Personal access tokens with read/write scopes, prefix-based identification (`pb_…`), one-time secret reveal, revocation. Full curl examples in-app. |
| **Settings** | Profile (name), theme (light/dark/system), workspace branding (name, accent, description), team members, notifications, password change (re-locks other sessions), account deletion (with shared-workspace preservation). |
| **Audit log** | Tracks logins, password changes, workspace mutations. Workspace-scoped, queryable, retained per `AUDIT_RETENTION_DAYS`. |

## 🛠 Tech stack

### Backend (`apps/api`)

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20+ | Server runtime |
| Framework | NestJS 10 | HTTP + WebSocket modules, DI, guards, pipes |
| Language | TypeScript 5 | Strict types end-to-end |
| Auth | `@nestjs/jwt`, `passport-jwt`, `bcrypt` | JWT access + rotating refresh tokens, bcrypt password hashing |
| ORM | Prisma 5 | Schema-first, type-safe queries, migrations |
| Database | SQLite (dev) / PostgreSQL (prod) | App data — same schema, swap connection string |
| Cache / coord | Redis 7 (`ioredis`) | Scheduler leader election, rate state |
| Realtime | Socket.IO 4 (`@nestjs/platform-socket.io`) | Live updates to clients |
| HTTP scheduler | `@nestjs/schedule` | Cron-driven check runner |
| HTTP client | `axios` | Outbound monitor probes |
| WebSocket client | `ws` | WebSocket monitoring + scanner |
| Email | `nodemailer` | SMTP delivery for alerts |
| Validation | `class-validator`, `class-transformer` | DTO validation |
| Security | `helmet`, `compression`, `@nestjs/throttler` | Headers, gzip, rate limiting |
| Docs | `@nestjs/swagger` | OpenAPI / Swagger UI at `/api/docs` |

### Frontend (`apps/web`)

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 | UI |
| Build | Vite 5 | Dev server, HMR, prod bundle |
| Language | TypeScript 5 | Strict types |
| Routing | React Router 6 | Client routing |
| Server state | TanStack Query 5 | Fetching, caching, invalidation |
| Client state | Zustand 4 (with `persist`) | Auth, workspace, theme, realtime stores |
| Styling | TailwindCSS 3 | Utility-first CSS, dark mode |
| Icons | Lucide React | Icon set |
| Charts | Recharts | Latency / uptime visualizations |
| Realtime client | `socket.io-client` | Connects to API gateway |
| HTTP | Axios | Bearer-token interceptors |
| Date | `date-fns` | Relative time |
| Testing | Vitest, Testing Library | Unit + component tests |

### Shared (`packages/`)

- **`@pulseboard/shared-types`** — Type-only package for DTOs and entity shapes used by both apps.
- **`@pulseboard/shared-utils`** — Pure helpers (id generation, duration formatting, etc.).

### Infrastructure

| Concern | Tool |
|---|---|
| Monorepo | npm workspaces |
| Containers | Docker Compose (Redis + Postgres) |
| Process orchestration | `npm-run-all` |
| Lint / format | ESLint + Prettier |

## 🏛 Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Browser (React + Vite, port 5173)                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ React Router → Pages → TanStack Query / Zustand stores  │  │
│  └────────────────────┬────────────────────────────────────┘  │
└───────────────────────┼───────────────────────────────────────┘
                        │ HTTPS + WebSocket
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────────┐   ┌──────────────────────┐
│ NestJS REST API      │   │ Socket.IO Gateway    │
│ /api/*               │   │ /socket.io           │
└──────────┬───────────┘   └──────────┬───────────┘
           │                          │
           │       ┌──────────────────┘
           ▼       ▼
┌────────────────────────────────────────────────┐
│ Application services (Nest modules)            │
│  auth · workspaces · services · monitors       │
│  checks · incidents · alerts · status-pages    │
│  scanner · audit · api-keys · scheduler        │
└──────────┬───────────────────────────┬─────────┘
           │                           │
           ▼                           ▼
   ┌──────────────┐            ┌──────────────┐
   │  Prisma      │            │  ioredis     │
   │  (SQLite or  │            │  (leader     │
   │   Postgres)  │            │   election,  │
   └──────────────┘            │   pubsub)    │
                                └──────────────┘
```

### How a check runs

1. **Scheduler tick** (every `SCHEDULER_TICK_INTERVAL_MS`) — the leader instance grabs a Redis lock, lists monitors due for execution, and dispatches each to the executor.
2. **Executor** — runs the right probe (HTTP, WebSocket, scanner) bounded by `timeoutMs` and retry config; persists a `CheckRun` with latency and assertion results.
3. **State machine** — increments `consecutiveFailures` / `consecutiveSuccesses` on the monitor; if a threshold is crossed, flips `lastStatus` to `down` / `up`.
4. **Auto-incident** — on transition to `down`, if `incidentAutoCreate=true`, opens a new `Incident` linked to the service.
5. **Realtime broadcast** — `monitor.updated` + `check.completed` events go out over Socket.IO to the workspace room.
6. **Alert evaluation** — matching `AlertPolicy` rows fan the event out to their `AlertChannel` deliveries; cooldown timestamps prevent spam.

## 🚀 Quick start

### Prerequisites

| Tool | Version | Required for |
|---|---|---|
| Node.js | ≥ 20 | All apps |
| npm | ≥ 10 | Workspaces |
| Redis | ≥ 7 | Scheduler lock + pubsub |
| Docker / Podman | optional | Easiest way to start Redis (and Postgres if used) |

### Install + run

```bash
# 1. Clone and install
git clone <repo-url> pulseboard
cd pulseboard
npm install

# 2. Bring up Redis (and Postgres if you want it)
docker compose -f infra/docker-compose.yml up -d
# Or with Podman: podman run -d --name pulseboard-redis -p 6379:6379 docker.io/library/redis:7-alpine

# 3. Configure environment
cp .env.example .env
cp .env.example apps/api/.env
# (edit if you want — defaults work for local dev)

# 4. Set up the database (SQLite by default, in apps/api/prisma/dev.db)
npm run db:migrate
npm run db:seed

# 5. Start everything (API on :4000, web on :5173)
npm run dev
```

Open <http://localhost:5173> and sign in with the demo account:

| Email | Password |
|---|---|
| `demo@pulseboard.dev` | `demo1234` |

API docs (Swagger UI): <http://localhost:4000/api/docs>

## 📁 Project structure

```
pulseboard/
├── apps/
│   ├── api/                       NestJS backend
│   │   ├── src/
│   │   │   ├── auth/             JWT auth, register/login/logout, password change
│   │   │   ├── users/            Profile, account deletion
│   │   │   ├── workspaces/       Multi-tenant workspaces, members, stats
│   │   │   ├── services/         Logical groupings of monitors
│   │   │   ├── monitors/         HTTP / WS / scan monitor configs
│   │   │   ├── checks/           Check-run history, latency, uptime
│   │   │   ├── incidents/        Incidents + timeline
│   │   │   ├── alerts/           Channels, policies, deliveries
│   │   │   ├── status-pages/     Internal CRUD + public read endpoint
│   │   │   ├── scanner/          OWASP-style WebSocket security scanner
│   │   │   ├── api-keys/         Personal access tokens
│   │   │   ├── audit/            Audit log
│   │   │   ├── realtime/         Socket.IO gateway
│   │   │   ├── scheduler/        Cron-driven check runner with Redis lock
│   │   │   ├── prisma/           PrismaService wrapper
│   │   │   ├── redis/            Redis service
│   │   │   ├── health/           Liveness + readiness
│   │   │   └── common/           Middleware, filters, helpers
│   │   └── prisma/
│   │       ├── schema.prisma     Database schema
│   │       ├── migrations/       Versioned migrations
│   │       └── seed.ts           Demo workspace + monitors
│   └── web/                       React + Vite frontend
│       └── src/
│           ├── pages/             Landing, dashboard, monitors, incidents, alerts, scanner, status-pages, settings, public-status
│           ├── components/        Layout + UI primitives
│           ├── lib/               api, auth-store, workspace-store, theme-store, realtime
│           └── index.css          Tailwind + scroll/cursor animations
├── packages/
│   ├── shared-types/              Type-only DTOs and entities
│   └── shared-utils/              Pure helpers
├── infra/
│   └── docker-compose.yml         Redis + Postgres
└── .env.example
```

## ⚙️ Configuration

All settings come from `.env` (or `.env.local` for overrides). The full list:

### Database

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite path or Postgres URL |
| `DATABASE_SSL` | `false` | Required for some hosted Postgres |

### Redis

| Var | Default | Notes |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Used by the scheduler and pubsub |
| `REDIS_HOST`, `REDIS_PORT` | `localhost`, `6379` | Alternate config form |

### Authentication

| Var | Default | Notes |
|---|---|---|
| `JWT_SECRET` | _(required in prod)_ | Min 32 chars, used to sign access tokens |
| `JWT_EXPIRES_IN` | `7d` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh-token lifetime |

### Application

| Var | Default | Notes |
|---|---|---|
| `APP_URL` | `http://localhost:5173` | Public web URL |
| `API_URL` | `http://localhost:4000` | Public API URL |
| `API_PORT` | `4000` | API listen port |
| `NODE_ENV` | `development` | `development` / `production` |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |

### Email (alerts)

| Var | Default | Notes |
|---|---|---|
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | Usually 587 (STARTTLS) or 465 (TLS) |
| `SMTP_USER`, `SMTP_PASS` | — | Credentials |
| `SMTP_FROM` | `PulseBoard <noreply@pulseboard.dev>` | From-header for email alerts |

### Slack (alerts)

| Var | Default | Notes |
|---|---|---|
| `SLACK_WEBHOOK_URL` | — | Default fallback webhook (per-channel URLs override this) |

### Scanner

| Var | Default | Notes |
|---|---|---|
| `SCANNER_MAX_DURATION_MS` | `30000` | Hard cap on a single scan |
| `SCANNER_MAX_MESSAGES` | `50` | Hard cap on messages sent during a scan |
| `SCANNER_MAX_PAYLOAD_SIZE` | `1024` | Bytes — limits payload-size probes |

### Scheduler

| Var | Default | Notes |
|---|---|---|
| `SCHEDULER_LOCK_TTL_MS` | `30000` | Redis leader-lock TTL |
| `SCHEDULER_TICK_INTERVAL_MS` | `10000` | How often the scheduler picks up due monitors |

### Rate limiting

| Var | Default | Notes |
|---|---|---|
| `RATE_LIMIT_TTL_MS` | `60000` | Window size for global throttling |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

### Retention

| Var | Default | Notes |
|---|---|---|
| `CHECK_RETENTION_DAYS` | `30` | How long to keep check runs |
| `AUDIT_RETENTION_DAYS` | `90` | How long to keep audit log entries |

### Demo

| Var | Default | Notes |
|---|---|---|
| `ENABLE_DEMO_MODE` | `true` | Seeds demo user and workspace |
| `DEMO_WORKSPACE_SLUG` | `demo` | Slug for the seeded workspace |

## 🧭 Monitor types

Each monitor has shared base fields plus a typed config table.

### Shared monitor fields

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | — | Human-readable label |
| `type` | `http` \| `ws` \| `scan` | — | Probe type |
| `intervalSeconds` | int | `60` | How often to run |
| `timeoutMs` | int | `30000` | Probe timeout |
| `retryCount` | int | `3` | In-run retries before failure |
| `failureThreshold` | int | `3` | Consecutive failures to mark `down` |
| `recoveryThreshold` | int | `3` | Consecutive successes to mark `up` |
| `slowThresholdMs` | int | `1000` | Above this = warning |
| `incidentAutoCreate` | bool | `true` | Open an incident on `down` transition |
| `maintenanceMode` | bool | `false` | Pause checks without deleting |

### HTTP monitor

| Field | Default | Description |
|---|---|---|
| `url` | — | Endpoint to probe |
| `method` | `GET` | Any HTTP verb |
| `headers` | `{}` | Sent on every probe |
| `body` | — | Optional request body |
| `expectedStatus` | `200` | Mark success only on this status |
| `expectedJsonPath` | — | JSONPath to assert |
| `expectedJsonValue` | — | Required value at that path |
| `authType` | `none` | `none` / `bearer` / `basic` |
| `authConfig` | `{}` | Token or username/password |
| `followRedirects` | `true` | Follow 3xx |
| `sslStrict` | `false` | Reject self-signed certs |

### WebSocket monitor

| Field | Description |
|---|---|
| `url` | `ws://` or `wss://` endpoint |
| `authMessage` | First message sent after connect (JSON or text) |
| `subscribePayload` | Subscription message |
| `expectedResponse` | Substring or JSONPath that confirms success |
| `pingInterval` | Optional keepalive ping |
| `closeAfterMs` | Hard cutoff |

### Scan monitor

A scheduled run of the WebSocket security scanner — see below.

## 🛡 WebSocket security scanner

The scanner performs **safe, non-destructive** WebSocket security tests. It is bounded in time and message count, never brute-forces credentials, and never floods the target.

### Required confirmations

Every scan requires two checkboxes before it will run:

1. **Ownership confirmation** — you own or have written permission to test the endpoint.
2. **Legal acknowledgement** — unauthorized scanning may violate laws like the US Computer Fraud and Abuse Act.

### Checks

| Check | What it tests | Severity if failing |
|---|---|---|
| Transport security | Endpoint uses `wss://` | High |
| Authentication required | Connection refuses unauthenticated clients | High |
| Origin handling | Server validates `Origin` header | Medium |
| Query token leakage | Detects tokens passed via `?token=…` (visible in logs) | Medium |
| Rate limiting | Rejects bursts of connection attempts | Medium |
| Schema validation | Server rejects malformed JSON cleanly | Medium |
| Event enumeration | Probes a small allow-list for hidden event names | Low |
| Payload size limits | Server enforces frame size | Low |
| Idle timeout | Server closes idle connections | Info |
| Error leakage | Errors don't expose stack traces | Info |

### Configurable inputs

| Input | Description |
|---|---|
| Target URL | `wss://…` endpoint |
| Auth type | `none` / `header` (Bearer) / `message` (first frame) / `query` |
| Auth value | Token / message body |
| Custom headers | JSON object sent on the upgrade request |
| Max duration (ms) | 5,000 – 120,000, hard ceiling |
| Max messages | 5 – 500 across all checks combined |
| Per-check toggles | Enable/disable each category individually |

Each scan produces a **score** (0–100), a **verdict** (`secure` / `warning` / `vulnerable` / `inconclusive`), and a list of **findings** with severity, evidence, recommendation, and CWE/OWASP references.

## 🔔 Alerting

### Channels

| Type | Configuration |
|---|---|
| **Email** | Recipient address(es) — comma-separate for multiple |
| **Slack** | Incoming webhook URL (optional channel override) |
| **Discord** | Channel webhook URL |
| **Webhook** | Endpoint URL + optional shared secret. PulseBoard signs the body as `X-PulseBoard-Signature: sha256=<hex>` |

The UI ships with **per-channel setup guides** and a one-click **Test send** to verify delivery.

### Policies

A policy decides *when* an event becomes an alert. Each policy has:

| Field | Description |
|---|---|
| `name` | Label |
| `event` | One of `incident_created`, `incident_resolved`, `incident_updated`, `monitor_down`, `monitor_recovered` |
| `severity` | Optional minimum severity (`critical` / `high` / `medium` / `low`) |
| `cooldownMinutes` | Suppress repeats within this window |
| `alertChannelIds[]` | Fan out to these channels |
| `enabled` | Toggle without deleting |

### Built-in templates

| Template | Event | Severity | Cooldown |
|---|---|---|---|
| Critical incidents (recommended) | `incident_created` | `critical` | 0 |
| High severity and above | `incident_created` | `high` | 15m |
| Any monitor goes down | `monitor_down` | any | 5m |
| Recovery confirmations | `monitor_recovered` | any | 0 |
| Incident resolved | `incident_resolved` | any | 0 |

### Webhook payload

```json
{
  "event": "incident_created",
  "severity": "critical",
  "title": "Payment API down",
  "message": "Payment API has failed 3 consecutive checks.",
  "incident": { "id": "…", "status": "open", "createdAt": "…" },
  "timestamp": "2026-05-30T12:00:00.000Z"
}
```

If a shared secret is configured, the request includes a signature header:

```
X-PulseBoard-Signature: sha256=<hex(hmac_sha256(secret, body))>
```

## 📰 Status pages

Each workspace can publish one or more public status pages at `/status/<slug>`.

| Feature | Description |
|---|---|
| Branding | Custom name, intro text, accent color, optional logo |
| Components | Pin services or individual monitors as components |
| Overall status | Auto-aggregated from component health |
| Active incidents | Live list with public summaries |
| Recent incidents | Last 10 resolved/closed |
| Auto-refresh | Page refetches every 30 seconds |
| Privacy | Only `published: true` pages are visible; no internal data exposed |
| Custom domains | `customDomain` field for production deployments behind a reverse proxy |

## 🔑 API keys

Generate personal access tokens to use the PulseBoard API from scripts and CI.

| Concept | Detail |
|---|---|
| Format | `pb_<48 hex chars>` |
| Storage | Stored as `sha256(token)` — the raw value is shown **once** |
| Prefix | First 10 chars saved for display (e.g. `pb_a1b2c3d4`) |
| Scopes | `read` (GET only) or `write` (full mutate) |
| Rotation | Revoke and re-create — there is no in-place rotation |
| Lifetime | Optional `expiresAt`; otherwise valid until revoked |

### Usage

```bash
curl -H "Authorization: Bearer pb_…" \
  http://localhost:4000/api/workspaces/<slug>/monitors

curl -X POST \
  -H "Authorization: Bearer pb_…" \
  -H "Content-Type: application/json" \
  -d '{"title":"DB latency","severity":"high"}' \
  http://localhost:4000/api/workspaces/<slug>/incidents
```

## 🌐 REST API

All authenticated endpoints expect either:

- a **JWT access token**: `Authorization: Bearer <jwt>` (issued by `/auth/login`), or
- an **API key**: `Authorization: Bearer pb_…` (created in Settings → API keys).

Workspace-scoped routes accept either the workspace `id` or its `slug` in `:workspaceId`.

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account; auto-creates a workspace |
| POST | `/api/auth/login` | Returns `accessToken` + `refreshToken` + `user` |
| POST | `/api/auth/refresh` | Rotate access token using a valid refresh token |
| POST | `/api/auth/logout` | Revoke the user's refresh tokens |
| GET | `/api/auth/me` | Current profile |
| PUT | `/api/auth/password` | Change password (revokes other sessions) |

### Users

| Method | Path | Description |
|---|---|---|
| GET | `/api/users/me/workspaces` | Workspaces the current user belongs to |
| PUT | `/api/users/me` | Update name / avatar |
| DELETE | `/api/users/me` | Delete account (requires password) |

### Workspaces

| Method | Path | Description |
|---|---|---|
| GET | `/api/workspaces` | List your workspaces |
| POST | `/api/workspaces` | Create |
| GET | `/api/workspaces/:id` | Detail (incl. members) |
| PUT | `/api/workspaces/:id` | Update name / description / branding |
| DELETE | `/api/workspaces/:id` | Delete (owner only) |
| GET | `/api/workspaces/:id/members` | List members |
| POST | `/api/workspaces/:id/members` | Add by email |
| PUT | `/api/workspaces/:id/members/:userId` | Change role |
| DELETE | `/api/workspaces/:id/members/:userId` | Remove |
| GET | `/api/workspaces/:id/stats` | Dashboard stats |

### Services / Monitors / Checks

| Method | Path | Description |
|---|---|---|
| GET | `/api/workspaces/:id/services` | List services |
| POST | `/api/workspaces/:id/services` | Create |
| GET, PUT, DELETE | `/api/workspaces/:id/services/:id` | Read / update / delete |
| GET | `/api/workspaces/:id/monitors` | List monitors |
| POST | `/api/workspaces/:id/monitors` | Create monitor (typed via `type`) |
| GET, PUT, DELETE | `/api/workspaces/:id/monitors/:id` | Read / update / delete |
| POST | `/api/workspaces/:id/monitors/:id/pause` | Pause |
| POST | `/api/workspaces/:id/monitors/:id/resume` | Resume |
| POST | `/api/workspaces/:id/monitors/:id/http-config` | Replace HTTP config |
| POST | `/api/workspaces/:id/monitors/:id/ws-config` | Replace WS config |
| POST | `/api/workspaces/:id/monitors/:id/scan-config` | Replace scan config |
| GET | `/api/workspaces/:id/checks/recent?limit=N` | Recent check runs |
| GET | `/api/workspaces/:id/checks/monitor/:monitorId/latency?days=N` | Latency history |
| GET | `/api/workspaces/:id/checks/monitor/:monitorId/uptime` | Uptime stats |

### Incidents

| Method | Path | Description |
|---|---|---|
| GET | `/api/workspaces/:id/incidents` | List (filters via query) |
| GET | `/api/workspaces/:id/incidents/active` | Active only |
| POST | `/api/workspaces/:id/incidents` | Create |
| GET | `/api/workspaces/:id/incidents/:id` | Detail with timeline |
| PUT | `/api/workspaces/:id/incidents/:id` | Update (status, severity, summaries) |
| POST | `/api/workspaces/:id/incidents/:id/updates` | Add timeline entry |
| POST | `/api/workspaces/:id/incidents/:id/resolve` | Mark resolved (with public summary) |
| POST | `/api/workspaces/:id/incidents/:id/close` | Close |
| GET | `/api/workspaces/:id/incidents/:id/timeline` | Timeline only |

### Alerts

| Method | Path | Description |
|---|---|---|
| GET, POST | `/api/workspaces/:id/alerts/channels` | Channels |
| PUT, DELETE | `/api/workspaces/:id/alerts/channels/:id` | Update / delete |
| GET, POST | `/api/workspaces/:id/alerts/policies` | Policies |
| PUT, DELETE | `/api/workspaces/:id/alerts/policies/:id` | Update / delete |
| GET | `/api/workspaces/:id/alerts/deliveries` | Delivery history |
| POST | `/api/workspaces/:id/alerts/test` | Send a test alert |

### Status pages

| Method | Path | Description |
|---|---|---|
| GET, POST | `/api/workspaces/:id/status-pages` | List / create |
| GET, PUT, DELETE | `/api/workspaces/:id/status-pages/:id` | CRUD |
| POST | `/api/workspaces/:id/status-pages/:id/components` | Add component |
| PUT, DELETE | `/api/workspaces/:id/status-pages/components/:componentId` | Edit / remove |
| POST | `/api/workspaces/:id/status-pages/:id/publish` | Publish |
| POST | `/api/workspaces/:id/status-pages/:id/unpublish` | Unpublish |
| GET | `/api/public/status/:slug` | **Public**, no auth |

### Scanner

| Method | Path | Description |
|---|---|---|
| POST | `/api/workspaces/:id/scanner/run` | Start a scan |
| GET | `/api/workspaces/:id/scanner/runs` | List runs |
| GET | `/api/workspaces/:id/scanner/runs/:id` | Run detail |
| GET | `/api/workspaces/:id/scanner/runs/:id/findings` | Findings |
| DELETE | `/api/workspaces/:id/scanner/runs/:id` | Delete a run |
| GET | `/api/workspaces/:id/scanner/stats` | Aggregate stats |

### API keys

| Method | Path | Description |
|---|---|---|
| GET | `/api/api-keys` | List your keys (no secrets) |
| POST | `/api/api-keys` | Create — response includes `token` once |
| DELETE | `/api/api-keys/:id` | Revoke |

### Other

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/health/stats` | DB and Redis health |
| GET | `/api/settings` | Public app settings + feature flags |
| GET | `/api/workspaces/:id/audit` | Audit log |

## 🔌 Realtime events

Frontend connects to the Socket.IO gateway after login and joins `workspace:<id>` rooms.

### Client → Server

| Event | Payload | Effect |
|---|---|---|
| `join` | `{ workspaceId, userId? }` | Join workspace room |
| `leave` | `{ workspaceId }` | Leave room |
| `subscribe` | `{ channel }` | Subscribe to a sub-channel |
| `unsubscribe` | `{ channel }` | Unsubscribe |
| `ping` | — | Returns `pong` with timestamp |

### Server → Client

| Event | Payload |
|---|---|
| `monitor.updated` | `{ monitorId, status, previousStatus, timestamp }` |
| `check.completed` | `{ checkRunId, monitorId, success, latencyMs, timestamp }` |
| `incident.created` | `{ incident, timestamp }` |
| `incident.updated` | `{ incidentId, status, severity, timestamp }` |
| `service.status.changed` | `{ serviceId, status, timestamp }` |
| `scanner.completed` | `{ scanRun, timestamp }` |

## 🗄 Database schema

Top-level Prisma models — see [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) for the full schema with relations and indexes.

| Model | Purpose |
|---|---|
| `User` | Account credentials and profile |
| `RefreshToken` | Rotating refresh tokens (hashed) |
| `Workspace` | Multi-tenant container |
| `WorkspaceMember` | User ↔ workspace with role |
| `Service` | Logical group of monitors |
| `Monitor` | Base monitor row |
| `MonitorHttpConfig` | HTTP-specific fields |
| `MonitorWsConfig` | WebSocket-specific fields |
| `MonitorScanConfig` | Scanner-specific fields |
| `CheckRun` | One probe execution |
| `CheckAssertion` | Per-run assertion result |
| `Incident` | Open/resolved/closed incident |
| `IncidentUpdate` | Timeline entry |
| `IncidentServiceLink` | Many-to-many incident ↔ service / monitor |
| `AlertChannel` | A delivery destination |
| `AlertPolicy` | Rule that maps events to channels |
| `AlertDelivery` | One delivery attempt with status |
| `StatusPage` | A public status page |
| `StatusPageComponent` | A pinned service or monitor on a page |
| `MaintenanceWindow` | Planned downtime |
| `ScannerRun` | One scanner execution |
| `ScannerFinding` | One issue produced by a scan |
| `ApiKey` | Personal access token (hashed) |
| `AuditLog` | Action history |

The schema is **provider-agnostic**: SQLite for `npm run dev`, Postgres for production. Switch by changing `provider` in `schema.prisma` and `DATABASE_URL`.

## 🧰 Development scripts

Run from the repo root.

| Script | Effect |
|---|---|
| `npm run dev` | Start API and web in parallel |
| `npm run dev:api` | API only |
| `npm run dev:web` | Web only |
| `npm run build` | Build API and web |
| `npm run typecheck` | TypeScript check across both apps |
| `npm run lint` | ESLint with `--fix` |
| `npm run format` | Prettier |
| `npm run test` | Unit tests in both apps |
| `npm run test:e2e` | API E2E tests |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo workspace |
| `npm run db:studio` | Open Prisma Studio |
| `npm run docker:up` | Start Redis + Postgres via Docker Compose |
| `npm run docker:down` | Stop them |

## 🚢 Deployment

PulseBoard ships as two independent Node processes plus Redis. Deploy them separately or together.

### Frontend → Vercel / Netlify

1. Connect the repo, set the build command to `npm run build:web` and output directory to `apps/web/dist`.
2. Environment:
   - `VITE_API_URL` → your API URL (e.g. `https://api.pulseboard.example.com/api`)
   - `VITE_SOCKET_URL` → your API origin (Socket.IO uses the same host)

### Backend → Railway / Render / Fly / your own box

1. Build command: `npm run build:api`
2. Start command: `npm -w @pulseboard/api run start:prod`
3. Environment: copy from `.env.example`. Make sure `JWT_SECRET` is at least 32 random characters and `CORS_ORIGINS` includes your frontend URL.
4. Run `npm run db:migrate` once at deploy time.
5. WebSocket support **must** be enabled on the platform — Socket.IO needs HTTP upgrade.

### Database

| Option | Notes |
|---|---|
| SQLite | Fine for solo / small teams. The DB file lives in `apps/api/prisma/dev.db`. |
| Hosted Postgres (Supabase, Neon, RDS) | Switch `provider = "postgresql"` in `schema.prisma` and update `DATABASE_URL`. Run `npx prisma migrate deploy`. |

### Redis

Any Redis 6+ works. For zero-downtime upgrades and multi-instance scheduling, you need Redis even in single-instance mode (the leader lock is what coordinates).

### Reverse proxy

Sample nginx for a single-host deploy:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:4000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
location /socket.io/ {
  proxy_pass http://127.0.0.1:4000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
location / {
  root /var/www/pulseboard;
  try_files $uri /index.html;
}
```

## 🤝 Contributing

PRs welcome. The workflow:

1. Fork and clone
2. `npm install`
3. `npm run dev` and make your changes
4. `npm run typecheck && npm run lint && npm run test`
5. Commit (Conventional Commits encouraged: `feat:`, `fix:`, `docs:`, `chore:`)
6. Open a PR

For larger work, please open an issue first to discuss the approach.

## 📄 License

[MIT](LICENSE)

---

<div align="center">

Built for developers who want fewer pages, fewer dashboards, and a single source of truth for "is the thing up?"

</div>
