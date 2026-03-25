FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER appuser
EXPOSE 4000

CMD ["node", "dist/main"]
