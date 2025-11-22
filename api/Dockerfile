# API Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.21.0 --activate

# Install dependencies for better-sqlite3 and health check tools
RUN apk add --no-cache python3 make g++ sqlite wget

FROM base AS deps
WORKDIR /app

# Copy package files
COPY api/package.json api/pnpm-lock.yaml api/pnpm-workspace.yaml ./

# Install dependencies
WORKDIR /app
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY api/package.json api/tsconfig.json ./
COPY api/src ./src
COPY api/drizzle ./drizzle

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
COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle

# Create necessary directories
RUN mkdir -p data uploads && \
    chown -R nodejs:nodejs data uploads

USER nodejs

EXPOSE 4000

ENV PORT=4000
ENV HOST=0.0.0.0

CMD ["node", "dist/index.js"]

