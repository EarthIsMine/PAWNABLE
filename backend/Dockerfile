FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV CI=true
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.26.2 --activate

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
COPY backend/prisma.config.ts ./backend/prisma.config.ts
COPY backend/prisma/schema.prisma ./backend/prisma/schema.prisma
RUN pnpm install --frozen-lockfile --filter @pawnable/backend...
COPY backend ./backend
RUN pnpm --filter @pawnable/backend build && pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8085
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
WORKDIR /app/backend
EXPOSE 8085
CMD ["node", "dist/index.js"]
