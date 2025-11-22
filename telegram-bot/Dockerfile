# Telegram Bot Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.21.0 --activate

FROM base AS deps
WORKDIR /app

# Copy package files
COPY telegram-bot/package.json telegram-bot/pnpm-lock.yaml ./

# Install dependencies
WORKDIR /app
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY telegram-bot/package.json telegram-bot/tsconfig.json ./
COPY telegram-bot/src ./src

# Build TypeScript
WORKDIR /app
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs

CMD ["node", "dist/index.js"]

