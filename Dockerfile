# Game server image (used by Fly.io and Render). Build context: repository root.
# Note: not built in CI yet; the steps were checked by running them by hand outside Docker.
FROM node:24-slim
RUN corepack enable
WORKDIR /app
ENV CI=true
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @spy-game/server...
COPY packages/game-core packages/game-core
COPY apps/server apps/server
RUN pnpm --filter @spy-game/game-core build && pnpm --filter @spy-game/server build
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "apps/server/dist/main.js"]
