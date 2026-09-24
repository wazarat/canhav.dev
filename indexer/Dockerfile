# Ponder indexer for Robinhood Chain Testnet (chain 46630).
#
# Node 22 is not optional: ponder/src/bin/commands/start.ts exits 1 on a lower
# major, and package.json declares engines.node >= 22.
#
# `generated/` is gitignored, so codegen has to run here rather than being
# copied in. It needs devDependencies (typescript), so NODE_ENV is only set to
# production afterwards, for the runtime.
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ponder codegen

ENV NODE_ENV=production
# Ponder reads process.env.PORT (internal/options.ts) ahead of --port and its
# 42069 default, so the host's injected port works with no code change.
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
