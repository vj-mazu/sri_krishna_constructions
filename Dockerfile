# Build the React client
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json client/package-lock.json ./
COPY client/index.html client/tsconfig*.json client/vite.config.ts client/postcss.config.js client/tailwind.config.js ./
COPY client/public ./public
COPY client/src ./src
RUN npm ci
RUN npm run build

# Build the server and Prisma client
FROM node:20-slim AS server-builder
WORKDIR /app/server
COPY server/package*.json server/package-lock.json ./
COPY server/prisma ./prisma
COPY server/src ./src
RUN npm ci
RUN npx prisma generate

# Final production image
FROM node:20-slim AS production
WORKDIR /app
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/package.json ./server/package.json
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=server-builder /app/server/src ./server/src
EXPOSE 5000
ENV NODE_ENV=production
CMD ["sh", "-c", "npx prisma db push && node server/src/server.js"]