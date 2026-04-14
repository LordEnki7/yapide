FROM node:24-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY package.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

RUN pnpm --filter @workspace/api-server deploy --prod /deploy

RUN cp -r /app/artifacts/api-server/dist /deploy/dist

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /deploy

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
