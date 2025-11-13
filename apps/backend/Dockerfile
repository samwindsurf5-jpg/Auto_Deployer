# Backend Dockerfile for Railway deployment
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci --only=production

# Build the application
FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN cd apps/backend && npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
