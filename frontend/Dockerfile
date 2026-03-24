FROM node:24-alpine
WORKDIR /
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN pnpm install
COPY .next ./.next
COPY public ./public
COPY next.config.ts ./
COPY src ./src
EXPOSE 3005
CMD ["pnpm", "start", "--port", "3005"]
