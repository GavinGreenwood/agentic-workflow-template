FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json package-lock.json turbo.json ./
COPY apps/web/package*.json apps/web/
COPY packages/ packages/

RUN npm ci --workspace=apps/web --workspace=packages/shared --workspace=packages/ui --include-workspace-root

COPY apps/web/ apps/web/
COPY packages/ packages/

ARG APP_VERSION=0.0.0
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

# ── Production image ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ARG APP_VERSION=0.0.0
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
