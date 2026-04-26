FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ src/
RUN npm run build

FROM --platform=linux/amd64 node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# RDS CA bundle
RUN mkdir -p certs && \
    wget -q -O certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

EXPOSE 4000
CMD ["node", "dist/main"]
