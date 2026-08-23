# Build the React client
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build the server and Prisma client
FROM node:20-slim AS server-builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma
COPY server/seeds ./seeds
COPY server/src ./src
RUN npm ci
RUN npx prisma generate

# Final production image
FROM node:20-slim AS production
RUN apt-get update -y && apt-get install -y openssl postgresql-client && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/package.json ./server/package.json
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=server-builder /app/server/seeds ./server/seeds
COPY --from=server-builder /app/server/src ./server/src
EXPOSE 5000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/auth/me').then(r => process.exit(r.status === 401 ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "cd server && node src/server.js"]