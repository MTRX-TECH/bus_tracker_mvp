# Multi-stage production build for Zero-Cost hosting on Fly.io / Render / Docker
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install root dependencies in monorepo
RUN npm install

COPY shared ./shared
COPY backend ./backend

# Build shared library and backend application
RUN npm --workspace=shared run build
RUN npm --workspace=backend run build

# Final ultra-minimal runtime container
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/package*.json ./

EXPOSE 5000

CMD ["node", "backend/dist/server.js"]
