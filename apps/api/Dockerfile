# Stage 1: build
# Context: repo root (so packages/shared is available for @torget/shared path alias)
FROM node:20-alpine AS builder
WORKDIR /app

# Install API dependencies
COPY apps/api/package*.json ./apps/api/
RUN cd apps/api && npm install

# Copy shared package (needed for @torget/shared path alias during tsc)
COPY packages/shared ./packages/shared

# Copy API source and build
COPY apps/api ./apps/api
# tsc infers rootDir as repo root (due to ../../packages/shared), so output is
# dist/apps/api/src/... and dist/packages/shared/...
RUN cd apps/api && npm run build

# Stage 2: production
FROM node:20-alpine
WORKDIR /app/apps/api

COPY apps/api/package*.json ./
RUN npm install --omit=dev

# Copy compiled JS (with inferred rootDir, output lives in dist/apps/api/...)
COPY --from=builder /app/apps/api/dist ./dist

# Copy SQL migration files next to their compiled JS counterpart
# (migrate.js uses __dirname which resolves to dist/apps/api/drizzle/)
COPY apps/api/drizzle/migrations ./dist/apps/api/drizzle/migrations

EXPOSE 3000
CMD ["node", "dist/apps/api/src/index.js"]
