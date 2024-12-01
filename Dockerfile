FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Copy all workspace configs and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Build shared packages first
RUN pnpm --filter "@fedjobs/types" build
RUN pnpm --filter "@fedjobs/utils" build
RUN pnpm --filter "@fedjobs/database" build

# Build API
RUN pnpm --filter "@fedjobs/api" build

EXPOSE 3001
CMD ["pnpm", "--filter", "@fedjobs/api", "start"]