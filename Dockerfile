# Game server image (used by Fly.io and Render). Build context: repository root.
# Note: not built in CI yet; the steps were checked by running them by hand outside Docker.
FROM node:24-slim
RUN corepack enable
WORKDIR /app
ENV CI=true
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @espiao/server...
COPY packages/game-core packages/game-core
COPY apps/server apps/server
RUN pnpm --filter @espiao/game-core build && pnpm --filter @espiao/server build
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "apps/server/dist/main.js"]
