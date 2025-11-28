# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and lock file
COPY package*.json ./
COPY tsconfig*.json ./

# Copy workspace package files
COPY apps/booking-service/package*.json ./apps/booking-service/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including dev dependencies for build)
# Install from root to handle workspaces correctly
RUN npm install

# Copy shared package source code and build it first
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm run build

# Copy source code
WORKDIR /app
COPY apps/booking-service ./apps/booking-service

# Build the application
WORKDIR /app/apps/booking-service
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Install wget for health checks
RUN apk add --no-cache wget

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy only Booking Service package.json
COPY apps/booking-service/package*.json ./apps/booking-service/

# Copy built application from builder stage
COPY --from=builder /app/apps/booking-service/dist ./apps/booking-service/dist

# Copy built shared package (needed for runtime)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy node_modules from builder stage (pruned in production)
COPY --from=builder /app/node_modules ./node_modules

# Prune dev dependencies
RUN npm prune --omit=dev && \
    npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/apps/booking-service

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]

