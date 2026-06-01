FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
EXPOSE 4000
# db push creates the schema directly (no migration files required).
# Seed is idempotent (uses upsert) and runs on every boot.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && (npx prisma db seed 2>&1 || echo '[seed] failed - continuing') && node dist/main.js"]
