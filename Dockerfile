# Build the React client
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Build the server and Prisma client
FROM node:20-slim AS server-builder
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma
COPY server/seeds ./seeds
COPY server/src ./src
RUN npm install
RUN npx prisma generate

# Final production image
FROM node:20-slim AS production
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/package.json ./server/package.json
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=server-builder /app/server/seeds ./server/seeds
COPY --from=server-builder /app/server/src ./server/src
EXPOSE 5000
ENV NODE_ENV=production
CMD ["sh", "-c", "cd server && npx -y prisma db push && node src/server.js"]