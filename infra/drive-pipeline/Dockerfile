FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY index.mjs promote.mjs ./

CMD ["sh", "-c", "node index.mjs && node promote.mjs"]
