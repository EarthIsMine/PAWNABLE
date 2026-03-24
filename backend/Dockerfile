FROM node:24-alpine
WORKDIR /
COPY package.json ./
RUN corepack enable
RUN pnpm install --shamefully-hoist
COPY . .
RUN pnpm build
EXPOSE 8085
CMD ["pnpm","start"]