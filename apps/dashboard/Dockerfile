FROM node:20-alpine

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/dashboard/package.json ./apps/dashboard/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/tailwind-config/package.json ./packages/tailwind-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=http://api:4000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN pnpm --filter dashboard build

EXPOSE 3000

CMD ["pnpm", "--filter", "dashboard", "exec", "next", "start", "--port", "3000"]
