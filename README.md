# Lumen Backend

NestJS REST API for **Lumen** — a self-hosted IT ticketing system built for 600+ employees. Serves as the backend for a Jira Service Management / Zendesk alternative.

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | NestJS 10 (TypeScript) |
| Database | PostgreSQL via Prisma ORM |
| Auth | Keycloak OIDC (JWT / JWKS) |
| Job Queue | BullMQ + Redis |
| File Storage | MinIO (S3-compatible) |
| Email | Nodemailer (SMTP) |
| Search | PostgreSQL full-text search |
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

# 4. Run database migrations
npx prisma migrate dev

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
npx prisma migrate dev  # Run DB migrations
npx prisma generate     # Regenerate Prisma client
npx prisma studio       # Open Prisma GUI
```

## Architecture

The backend is a **modular monolith**. Each domain is an isolated NestJS module following a strict three-layer pattern:

```
Controller  →  Service  →  Repository  →  Prisma / External Services
```

- **Controllers** handle HTTP routing and request/response shaping only.
- **Services** contain all business logic — no direct DB calls.
- **Repositories** own all database access — no business logic.

### Modules

| Module | Path | Responsibility |
|---|---|---|
| `auth` | `src/auth/` | Keycloak JWT validation, user auto-provisioning, RBAC guards |
| `users` | `src/users/` | User profiles and department assignment |
| `tickets` | `src/tickets/` | Core CRUD, status machine, priority, assignment, audit events |
| `comments` | `src/comments/` | Threaded comments on tickets |
| `attachments` | `src/attachments/` | MinIO file upload/download, metadata storage |
| `notifications` | `src/notifications/` | BullMQ email job consumer (SMTP dispatch) |
| `search` | `src/search/` | PostgreSQL full-text search with ILIKE fallback |
| `prisma` | `src/prisma/` | Global PrismaService singleton |

## API Endpoints

All routes are prefixed with `/api` and require a `Bearer` JWT unless noted.

### Tickets
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tickets` | List tickets (filter by `status`, `priority`, `assigneeId`) |
| `GET` | `/api/tickets/:id` | Get ticket with comments, attachments, events |
| `POST` | `/api/tickets` | Create ticket |
| `PATCH` | `/api/tickets/:id` | Update title, description, status, or priority |
| `POST` | `/api/tickets/:id/assign` | Assign an agent to a ticket |
| `DELETE` | `/api/tickets/:id` | Soft-delete (submitter or ADMIN only) |

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

### Users
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all active users |
| `GET` | `/api/users/:id` | Get user by ID |

### Search
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/search?q=<query>` | Full-text search across tickets (max 20 results) |

## Data Model

```
User ──< TicketAssignment >── Ticket ──< TicketComment
                                 │
                                 ├──< Attachment
                                 ├──< TicketEvent  (audit log)
                                 └──< TicketTag >── Tag

User ──< Department ──< Ticket
```

### Key Design Decisions

- **Soft deletes everywhere** — all models have a `deletedAt` field; nothing is hard-deleted.
- **TicketEvent is the audit log** — every status change, assignment, and creation writes an immutable event row with actor and JSON payload.
- **TicketAssignment has a unique constraint** on `(ticketId, agentId)`, upserted on assign.

### Enums

**Role**: `ADMIN` | `AGENT` | `USER`

**TicketStatus**: `OPEN` | `IN_PROGRESS` | `PENDING` | `RESOLVED` | `CLOSED`

**TicketPriority**: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

## Authentication & Authorization

1. The frontend redirects unauthenticated users to Keycloak.
2. Keycloak issues a signed JWT on login.
3. Every request sends `Authorization: Bearer <jwt>`.
4. `JwtAuthGuard` validates the token against Keycloak's JWKS endpoint.
5. On first valid login, `AuthService` auto-creates the user in the local DB (identity sync).
6. `RolesGuard` + `@Roles()` decorator enforce role-based access on specific routes.

## Async Jobs

BullMQ queues backed by Redis handle all async work:

| Queue | Trigger | Handler |
|---|---|---|
| `email` | Ticket created, status changed | `EmailProcessor` — sends SMTP email via nodemailer |

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
