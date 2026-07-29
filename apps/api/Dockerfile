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

# The base image bundles npm, which is not needed at runtime. Its vendored tar
# (7.5.15) carries CVE-2026-59873, which the blocking Trivy CRITICAL gate flags
# and which cannot be fixed from our package.json. Dropping npm removes it.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Root node_modules (production-only after prune above). @nestjs/* now resolves
# at the root, so there is no workspace-nested node_modules to mirror.
COPY --from=builder /app/node_modules ./node_modules
# Copy shared package so node_modules/@template/shared symlink resolves at runtime
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
