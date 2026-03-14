FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY build-aggregates.mjs incremental-hourly.mjs ./

CMD ["node", "build-aggregates.mjs"]
