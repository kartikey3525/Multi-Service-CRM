FROM node:lts-alpine AS base
RUN npm install --global pnpm@12.11.2
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter @franchise-crm/shared build
RUN pnpm --filter @franchise-crm/api build

FROM node:lts-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/packages/shared ./packages/shared
COPY --from=builder /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=builder /workspace/apps/api/migrate-mongo-config.js ./apps/api/migrate-mongo-config.js
COPY --from=builder /workspace/apps/api/migrations ./apps/api/migrations
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
