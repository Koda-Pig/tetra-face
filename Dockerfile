# syntax = docker/dockerfile:1
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
RUN npm install -g pnpm@latest

# Build stage
FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

COPY .npmrc package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Skip environment validation during build (env vars only needed at runtime)
ENV SKIP_ENV_VALIDATION=true
ENV AUTH_TRUST_HOST=true

COPY . .
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy built app and dependencies
COPY --from=build /app/src ./src
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]