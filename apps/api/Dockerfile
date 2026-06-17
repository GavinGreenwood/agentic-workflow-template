FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json package-lock.json turbo.json ./
COPY apps/api/package*.json apps/api/
COPY packages/ packages/

RUN npm ci --workspace=apps/api --workspace=packages/shared --include-workspace-root

COPY apps/api/ apps/api/
COPY packages/ packages/

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api

# Prune devDependencies before copying to the runner stage
RUN npm prune --omit=dev

# ── Production image ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ARG APP_VERSION=0.0.0
ENV npm_package_version=$APP_VERSION
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 3001
CMD ["node", "dist/main"]
