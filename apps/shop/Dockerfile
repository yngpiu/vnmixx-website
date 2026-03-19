FROM node:20-alpine

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/shop/package.json ./apps/shop/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/tailwind-config/package.json ./packages/tailwind-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter shop build

EXPOSE 3001

CMD ["pnpm", "--filter", "shop", "start", "--", "--port", "3001"]
