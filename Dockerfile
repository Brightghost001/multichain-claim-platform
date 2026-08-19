# ═══════════════════════════════════════════════════════════
# Dockerfile — Multi-Chain Claim Platform
# Single image: Next.js frontend + Fastify backend
# ═══════════════════════════════════════════════════════════

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production image ──
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./
COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3000 4000

# Start backend API (Next.js can be added separately if needed)
CMD ["node", "backend/dist/server.js"]
