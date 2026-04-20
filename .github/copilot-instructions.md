# Copilot Instructions for VNMIXX

## Build, lint, type-check, and test

Run commands from the repository root unless noted.

```bash
pnpm install
pnpm docker:dev:up
pnpm dev
```

```bash
pnpm build
pnpm lint
pnpm check-types
pnpm format
```

### Tests

There is no root-level `test` script. Automated tests are currently in `apps/api` (Jest).

```bash
pnpm --filter api test
pnpm --filter api test:e2e
```

Run a single test file:

```bash
pnpm --filter api test -- src/auth/services/token.service.spec.ts
```

Run a single test by name:

```bash
pnpm --filter api test -- -t "should issue token pair"
```

## High-level architecture

- This is a Turborepo + PNPM monorepo with three apps: `apps/api` (NestJS), `apps/dashboard` (Next.js admin), and `apps/shop` (Next.js storefront), plus shared packages under `packages/*` (`@repo/ui`, shared ESLint/Tailwind/TS configs).
- API runtime is NestJS + Prisma (MySQL) + Redis. `AppModule` composes domain modules (auth, product, order, rbac, etc.), and `CoreModule` registers cross-cutting concerns (global exception filter, response transform interceptor, metrics interceptor, health checks, CLS request context, logging/metrics/tracing).
- API routes are URI-versioned (`/v1/...`) and documented via Swagger at `/docs`.
- Dashboard is feature-modular: route files in `apps/dashboard/app/**` are mostly thin shells, while feature logic lives in `apps/dashboard/modules/**` (`api`, `types`, `hooks`, `components`, `utils`).
- Dashboard authentication is a coordinated flow across `proxy.ts`, `app/api/auth/refresh/route.ts`, `modules/auth/*`, and `lib/axios.ts`: refresh/access cookies are rotated server-side, access token is mirrored into Zustand for browser requests, and axios retries once after refresh on 401.
- Shop app currently remains lightweight (basic app shell + shared UI), while admin/dashboard and API contain the main business workflows.

## Key conventions (project-specific)

- **Response envelope is standardized in API**: success responses are wrapped as `{ success: true, data, timestamp }` by a global interceptor; errors are normalized by a global exception filter with `{ success: false, statusCode, code, message, ... }`.
- **Role-separated endpoints are explicit**: customer flows are mainly under `/auth` and `/me/*`; employee/admin flows use `/auth/admin/*` and `/admin/*`. Keep this split when adding endpoints.
- **Admin module slugs are the contract between dashboard and API**: `apps/dashboard/config/admin-modules.ts` maps UI routes to API paths/module names. Update this mapping when adding/removing admin domains.
- **Token refresh pattern should stay centralized**: use dashboard `proxy.ts` + `/api/auth/refresh` route + shared `apiClient`; avoid introducing parallel refresh mechanisms.
- **Soft-delete filtering has a shared helper**: prefer `softDeletedWhere(...)` in `apps/api/src/common/prisma/soft-deleted-where.ts` over ad-hoc `deletedAt` conditions.
- **Prisma client import path is generated**: API imports Prisma types/client from `generated/prisma/client` (generator output in `apps/api/generated/prisma`), not the default `@prisma/client`.
- **Git hooks enforce staged-file formatting/linting**: pre-commit runs Prettier and per-app ESLint on staged files only; pre-push runs `pnpm format`, `pnpm lint`, and `pnpm check-types` for the full repo.
- **Commit messages follow Conventional Commits in Vietnamese**: `<type>(scope): nội dung tiếng Việt`.
