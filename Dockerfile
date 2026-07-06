# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time — pass them here
ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_STORAGE_DRIVER="filesystem"
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_STORAGE_DRIVER=$NEXT_PUBLIC_STORAGE_DRIVER

RUN npm run build

# Stage 2: runtime — lean image, no dev deps
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV SQLITE_DB_PATH=/app/data/novinki.db
ENV UPLOAD_DIR=/app/uploads
ENV NEXT_PUBLIC_STORAGE_DRIVER=filesystem

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/migrations ./migrations

# Persistent directories — mount both as Docker volumes
RUN mkdir -p /app/data /app/uploads

EXPOSE 3000

CMD ["node", "server.js"]
