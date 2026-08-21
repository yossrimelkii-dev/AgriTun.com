# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
# Multi-stage Dockerfile for the TunAgri pnpm monorepo.
# Builds:  @agrimed/types → @agrimed/db → @agrimed/web
# Result:  Slim Next.js standalone runtime image (~180 MB).
# ─────────────────────────────────────────────────────────────

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.12.0

# ── 1. Base image with pnpm ──────────────────────────────────
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
# Some native deps (bcryptjs is pure JS, but keep this line if you later add sharp/etc.)
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── 2. Install dependencies (cached layer) ───────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
# Use BuildKit cache mount for pnpm's store to speed up rebuilds.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── 3. Build every workspace package in dependency order ─────
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars must be present at build time — Next.js inlines them
# into the client bundle. Runtime env (env_file in compose) is too late.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY . .
# `pnpm -r build` respects workspace dependency order → types & db built before web.
RUN pnpm -r build

# ── 4. Runtime image (slim) ──────────────────────────────────
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# Non-root user for the app process.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy the Next.js standalone output. Because we set
# `outputFileTracingRoot` to the monorepo root, `standalone/`
# contains apps/web + apps/web/node_modules + packages/*.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

# Standalone bundle's entrypoint (relative to monorepo root inside the image).
CMD ["node", "apps/web/server.js"]
