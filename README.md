# Lumen Backend

NestJS REST API for **Lumen** — a self-hosted IT ticketing system.

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | NestJS 10 (TypeScript) |
| Database | PostgreSQL via Prisma ORM 5.22 |
| Auth | Keycloak OIDC (JWT validated via JWKS) |
| Job Queue | BullMQ + Redis |
| File Storage | MinIO (S3-compatible) |
| Email | Nodemailer (SMTP) |
| Search | PostgreSQL full-text search (ILIKE) |
| Validation | Zod 4 schemas + ZodExceptionFilter |
| Docs | Swagger / OpenAPI at `/api/docs` |

## Prerequisites

- Node.js 20+
- Docker (for infrastructure)
- The full stack requires Postgres, Redis, Keycloak, and MinIO — all provided via Docker Compose at the monorepo root.

## Getting Started

```bash
# 1. Start infrastructure from monorepo root
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env

# 4. Push database schema
npx prisma db push

# 5. Start in watch mode
npm run start:dev
```

The API will be available at `http://localhost:3001/api`.
Swagger docs: `http://localhost:3001/api/docs`

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/lumen` |
| `REDIS_URL` | Redis URL for BullMQ | `redis://localhost:6379` |
| `KEYCLOAK_URL` | Keycloak server URL | `http://localhost:8080` |
| `KEYCLOAK_REALM` | Keycloak realm name | `lumen` |
| `MINIO_ENDPOINT` | MinIO host | `localhost` |
| `MINIO_PORT` | MinIO port | `9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `MINIO_BUCKET` | Bucket name | `lumen-attachments` |
| `SMTP_HOST` | SMTP server host | `localhost` |
| `SMTP_PORT` | SMTP port | `1025` |
| `SMTP_FROM` | Sender address | `noreply@lumen.local` |
| `PORT` | API server port | `3001` |

## Commands

```bash
npm run start:dev       # Start in watch mode
npm run build           # Compile TypeScript
npm run start:prod      # Run compiled output
npm run lint            # ESLint
npm run test            # Unit tests (Jest)
npm run test:e2e        # E2E tests
npx prisma db push      # Push schema to DB
npx prisma generate     # Regenerate Prisma client
npx prisma studio       # Open Prisma GUI
```

## Architecture

The backend is a **modular monolith**. Each domain is an isolated NestJS module following a strict three-layer pattern:

```
Controller  →  Service  →  Repository  →  Prisma / External Services
```

- **Controllers** handle HTTP routing, request validation (Zod schemas), and response shaping only.
- **Services** contain all business logic, audit event creation, and email queue dispatch — no direct DB calls.
- **Repositories** own all database access — no business logic.

### Modules

| Module | Path | Responsibility |
|---|---|---|
| `auth` | `src/auth/` | Keycloak JWT validation via Passport + JWKS, user auto-provisioning on first login, RBAC guards (`@Roles()`) |
| `users` | `src/users/` | User listing, role updates (ADMIN-only `PATCH /users/:id/role`) |
| `tickets` | `src/tickets/` | Full CRUD, status transitions, priority, assignment, audit events for every field change |
| `comments` | `src/comments/` | Threaded comments on tickets |
| `attachments` | `src/attachments/` | MinIO file upload/download (10 MB limit), presigned download URLs |
| `notifications` | `src/notifications/` | BullMQ email job consumer — sends SMTP emails via Nodemailer |
| `search` | `src/search/` | PostgreSQL ILIKE search across ticket titles (max 20 results) |
| `categories` | `src/categories/` | Ticket category CRUD with soft delete (ADMIN/AGENT only) |
| `departments` | `src/departments/` | Department CRUD with ticket count, soft delete (ADMIN/AGENT only) |
| `analytics` | `src/analytics/` | Admin dashboard — optimized SQL aggregations (`GROUP BY`, `date_trunc`), agent performance |
| `prisma` | `src/prisma/` | Global `PrismaService` singleton (connection pool: 10) |

## API Endpoints

All routes are prefixed with `/api` and require a `Bearer` JWT unless noted.

### Tickets

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tickets` | List tickets (paginated, filterable by `status`, `priority`, `categoryId`, `departmentId`, `assigneeId`, `search`, sortable) |
| `GET` | `/api/tickets/:id` | Get ticket detail with comments, attachments, assignments, events, category, department |
| `GET` | `/api/tickets/:id/events` | Get audit event log for a ticket |
| `POST` | `/api/tickets` | Create ticket (all fields required: `title`, `description`, `priority`, `categoryId`, `departmentId`, `site`) |
| `PATCH` | `/api/tickets/:id` | Update ticket (status, priority, title, description, category, department) — each change creates an audit event |
| `POST` | `/api/tickets/:id/assign` | Assign an agent (upsert — creates ASSIGNED/UNASSIGNED events) |
| `DELETE` | `/api/tickets/:id` | Soft-delete (submitter or ADMIN only) |

> **Note**: `USER`-role users only see their own tickets (enforced at the controller level).

### Comments

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tickets/:ticketId/comments` | List comments for a ticket |
| `POST` | `/api/tickets/:ticketId/comments` | Add a comment |
| `DELETE` | `/api/tickets/:ticketId/comments/:id` | Soft-delete a comment |

### Attachments

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tickets/:ticketId/attachments` | List attachments |
| `POST` | `/api/tickets/:ticketId/attachments` | Upload file (multipart, 10 MB max) |
| `GET` | `/api/tickets/:ticketId/attachments/:id/download` | Get 1-hour presigned download URL |
| `DELETE` | `/api/tickets/:ticketId/attachments/:id` | Soft-delete attachment |

### Categories

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/categories` | List all categories (with ticket count, soft-delete filtered) |
| `POST` | `/api/categories` | Create category (ADMIN/AGENT) |
| `PATCH` | `/api/categories/:id` | Update category (ADMIN/AGENT) |
| `DELETE` | `/api/categories/:id` | Soft-delete category (ADMIN/AGENT) |

### Departments

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/departments` | List all departments (with ticket count, soft-delete filtered) |
| `POST` | `/api/departments` | Create department (ADMIN/AGENT) |
| `PATCH` | `/api/departments/:id` | Update department (ADMIN/AGENT) |
| `DELETE` | `/api/departments/:id` | Soft-delete department (ADMIN/AGENT) |

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all active users |
| `GET` | `/api/users/:id` | Get user by ID |
| `PATCH` | `/api/users/:id/role` | Change user role (ADMIN only, validated: `ADMIN` / `AGENT` / `USER`) |

### Search

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/search?q=<query>` | Full-text search across tickets (max 20 results) |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/analytics/dashboard` | Admin dashboard aggregates (status/priority counts via SQL `GROUP BY`, weekly volume via `date_trunc`, agent performance, attention-needed list, category breakdown) |

## Data Model

```
User ──< TicketAssignment >── Ticket ──< TicketComment
                                 │
                                 ├──< Attachment
                                 └──< TicketEvent  (audit log)

Category ──< Ticket
Department ──< Ticket
User ──< Department
```

### Ticket Fields

| Field | Type | Notes |
|---|---|---|
| `title` | String | Required, max 200 chars |
| `description` | String | Required |
| `status` | Enum | `OPEN` → `IN_PROGRESS` → `PENDING` → `RESOLVED` → `CLOSED` |
| `priority` | Enum | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` |
| `categoryId` | FK → Category | Required on creation |
| `departmentId` | FK → Department | Required on creation |
| `site` | String | Required, validated: `Valleyfield`, `Beauharnois`, `Montréal`, `Brossard`, `Bromont`, `Hemmingford` |
| `resolvedAt` | DateTime? | Auto-set when status changes to RESOLVED, cleared when changed away |

### Audit Events (TicketEvent)

Every mutation writes an immutable event row with `actorId` and a JSON `payload`:

| Event Type | Trigger |
|---|---|
| `TICKET_CREATED` | Ticket creation |
| `STATUS_CHANGED` | Status update (`{ from, to }`) |
| `PRIORITY_CHANGED` | Priority update (`{ from, to }`) |
| `CATEGORY_CHANGED` | Category reassignment |
| `DEPARTMENT_CHANGED` | Department reassignment |
| `TITLE_CHANGED` | Title edit |
| `DESCRIPTION_CHANGED` | Description edit |
| `ASSIGNED` | Agent assigned (`{ agentId, agentName }`) |
| `UNASSIGNED` | Previous agent replaced |

### Database Indexes

The Ticket model has 9 indexes for query performance:

- `status`, `priority`, `categoryId`, `departmentId`, `submitterId`, `deletedAt`, `createdAt`, `resolvedAt`
- Composite: `(status, deletedAt)` for analytics

### Key Design Decisions

- **Soft deletes everywhere** — all models have a `deletedAt` field; nothing is hard-deleted.
- **TicketEvent is the audit log** — every field change writes an immutable event row with actor and JSON payload.
- **TicketAssignment uses upsert** — `@@unique([ticketId, agentId])` constraint prevents duplicates.
- **Connection pool size 10** — sized for parallel analytics queries.
- **All ticket creation fields are required** — enforced via Zod schema on `CreateTicketDto`.

### Enums

**Role**: `ADMIN` | `AGENT` | `USER`

**TicketStatus**: `OPEN` | `IN_PROGRESS` | `PENDING` | `RESOLVED` | `CLOSED`

**TicketPriority**: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

## Authentication & Authorization

1. The frontend redirects unauthenticated users to Keycloak.
2. Keycloak issues a signed JWT on login.
3. Every request sends `Authorization: Bearer <jwt>`.
4. `JwtAuthGuard` (Passport strategy) validates the token against Keycloak's JWKS endpoint.
5. On first valid login, `AuthService` auto-creates the user in the local DB (identity sync from Keycloak claims).
6. `RolesGuard` + `@Roles()` decorator enforce role-based access on specific routes.

### Role Permissions

| Role | Tickets | Categories/Departments | Users | Analytics |
|---|---|---|---|---|
| `USER` | Create, view own, comment, reopen | Read only | — | — |
| `AGENT` | All tickets, status changes, assign | Full CRUD | — | — |
| `ADMIN` | All AGENT permissions | Full CRUD | Role management | Dashboard |

## Async Jobs

BullMQ queues backed by Redis handle all async work:

| Queue | Trigger | Handler |
|---|---|---|
| `email` | Ticket created, status changed | `EmailProcessor` — sends SMTP email via Nodemailer |

## File Uploads

Files are uploaded as multipart form data (10 MB limit). The backend:
1. Generates a UUID-based storage key.
2. Uploads the buffer to MinIO.
3. Saves metadata (`filename`, `mimeType`, `size`, `storageKey`) in the `Attachment` table.

Downloads return a 1-hour presigned URL from MinIO — the client fetches the file directly.

## Docker

The `Dockerfile` is a multi-stage build:

1. **Builder** — installs all deps, generates Prisma client, compiles TypeScript.
2. **Runner** — copies only compiled output and production deps; no source or dev tooling.

```bash
docker build -t lumen-backend .
docker run -p 3001:3001 --env-file .env lumen-backend
```
