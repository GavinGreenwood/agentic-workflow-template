FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY apps/api/package*.json apps/api/
COPY packages/ packages/

RUN npm ci --workspace=apps/api --workspace=packages/shared --include-workspace-root

COPY apps/api/ apps/api/
COPY packages/ packages/

RUN npm run build --workspace=apps/api

# ── Production image ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ARG APP_VERSION=0.0.0
ENV npm_package_version=$APP_VERSION
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package*.json ./
COPY --from=builder /app/package*.json ./root-package.json

RUN npm ci --omit=dev --ignore-scripts

EXPOSE 3001
CMD ["node", "dist/main"]
