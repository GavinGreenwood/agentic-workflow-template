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

# Root node_modules (production-only after prune above)
COPY --from=builder /app/node_modules ./node_modules
# NestJS v11 is workspace-nested (root holds v10 from a transitive dep) — mirror
# the builder layout so Node's resolution algorithm finds the v11 packages.
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
# Copy shared package so node_modules/@template/shared symlink resolves at runtime
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
