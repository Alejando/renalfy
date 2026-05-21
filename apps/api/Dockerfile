FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# ── deps ──────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
WORKDIR /app/apps/api
RUN pnpm run build

# ── production image ──────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S renalfy && adduser -S renalfy -G renalfy

COPY --from=builder --chown=renalfy:renalfy /app/apps/api/dist ./dist
COPY --from=builder --chown=renalfy:renalfy /app/apps/api/generated ./generated
COPY --from=builder --chown=renalfy:renalfy /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=renalfy:renalfy /app/apps/api/package.json ./

USER renalfy

EXPOSE 3001
CMD ["node", "dist/main.js"]
