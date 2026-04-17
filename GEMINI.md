# VNMIXX Project Context

This document provides essential context and instructions for the VNMIXX project, a monorepo-based e-commerce platform.

## Project Overview

VNMIXX is a modern e-commerce website built with a monorepo architecture for efficiency and scalability.

- **Architecture:** Monorepo managed by [Turborepo](https://turbo.build/).
- **Package Manager:** [PNPM](https://pnpm.io/).
- **Backend:** [NestJS](https://nestjs.com/) (located in `apps/api`) using Prisma ORM with MySQL.
- **Frontend (Admin):** [Next.js](https://nextjs.org/) (located in `apps/dashboard`) using Shadcn UI.
- **Frontend (Shop):** [Next.js](https://nextjs.org/) (located in `apps/shop`).
- **Shared Packages:**
  - `@repo/ui`: Shared UI component library.
  - `@repo/eslint-config`, `@repo/tailwind-config`, `@repo/typescript-config`: Shared configurations.
- **Infrastructure:** Docker Compose for development (MySQL, Redis) and production.

## Building and Running

### Prerequisites

- Node.js >= 18
- PNPM installed (`npm install -g pnpm`)
- Docker and Docker Compose

### Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Initialize environment variables:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   # Optional frontend overrides
   cp apps/dashboard/.env.example apps/dashboard/.env
   cp apps/shop/.env.example apps/shop/.env
   ```

### Development

1. Start infrastructure services (MySQL, Redis):
   ```bash
   pnpm docker:dev:up
   ```
2. Run all applications in development mode:

   ```bash
   pnpm dev
   ```

   - API: [http://localhost:4000](http://localhost:4000)
   - Dashboard: [http://localhost:3000](http://localhost:3000)
   - Shop: [http://localhost:3001](http://localhost:3001)

### Other Key Commands

- `pnpm build`: Build all applications.
- `pnpm lint`: Lint the entire project.
- `pnpm check-types`: Run TypeScript type checking.
- `pnpm format`: Format code using Prettier.
- `pnpm docker:dev:down`: Stop infrastructure services.

## Development Conventions

### General TypeScript Guidelines

- **Language:** Use English for all code and documentation.
- **Typing:** Explicitly declare types for variables and functions. Avoid `any`.
- **Naming:**
  - Classes: `PascalCase`.
  - Variables/Functions: `camelCase`.
  - Files/Dirs: `kebab-case`.
  - Envs: `UPPERCASE`.
  - Booleans: Use verbs like `isX`, `hasX`, `canX`.
- **Functions:** Keep them short (< 20 instructions) and focused on a single purpose. Use RO-RO (Receive Object, Return Object) for complex parameters.
- **Testing:** Follow Arrange-Act-Assert and Given-When-Then patterns.

### NestJS (Backend) Specifics

- **Modular Architecture:** Organize the API into modules (one per main domain).
- **Structure:**
  - Controllers for routing.
  - Services for business logic and persistence.
  - DTOs for input validation (using `class-validator`).
  - Common module for shared logic (utils, decorators, guards, etc.).
- **Prisma:** Use Prisma for database interactions. Seeds are located in `apps/api/prisma/`.

### Frontend Specifics

- **Framework:** Next.js with App Router.
- **UI Components:** Use and extend the `@repo/ui` package. Components are built with Tailwind CSS (v4) and Shadcn UI.
- **State Management:** Zustand for local state, TanStack Query for server state.

## Git Workflow

### Pre-commit Rules

Before every commit, the following must be run sequentially on **staged files only**:

1. `pnpm prettier --write`
2. `pnpm eslint --fix`

**Target File Extensions:** `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.scss`, `.md`.

**Constraints:**

- If lint errors remain, the commit **must be blocked**.
- Do **not** run format/lint on the entire project during commit; only target staged files to maintain efficiency.

### Commit Message Rules

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification and be written in **Vietnamese**.

**Format:** `<type>(scope): nội dung tiếng Việt`

**Example:** `feat(api): thêm endpoint đăng ký người dùng mới`

## Quality Control

- **Git Hooks:** Managed by Husky.
- **ESLint/Prettier:** Strict adherence to the shared configurations in `packages/eslint-config`.
- **Pre-push:** The `pre-push` hook runs `pnpm format`, `pnpm lint`, and `pnpm check-types` on the entire project to ensure consistency before code leaves the local environment.
