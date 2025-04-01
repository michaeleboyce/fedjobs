# Stage 1: Builder - Installs deps, builds code
FROM node:20-slim AS builder

# Set environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_IGNORE_SIGNATURES=1 

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libgbm1 \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    fonts-liberation \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pnpm
RUN corepack disable pnpm
RUN npm install -g pnpm@9.10.0

# Copy package manifests for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/crawler/package.json ./packages/crawler/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Fix circular reference in API package build script
RUN sed -i 's/"build": "pnpm turbo run build --filter=@fedjobs\/api..."/"build": "tsc"/' apps/api/package.json

# Build packages in sequence
RUN pnpm turbo run build --filter=@fedjobs/types && \
    pnpm turbo run build --filter=@fedjobs/database && \
    pnpm turbo run build --filter=@fedjobs/utils && \
    pnpm turbo run build --filter=@fedjobs/crawler && \
    pnpm turbo run build --filter=@fedjobs/api

# Stage 2: Runner - Production image
FROM node:20-slim AS runner

# Install Playwright runtime dependencies
RUN apt-get update && apt-get install -y \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm" 
ENV PATH="$PNPM_HOME:$PATH" 

WORKDIR /app

# Install pnpm
RUN corepack disable pnpm
RUN npm install -g pnpm@9.10.0

# Copy monorepo configuration
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/crawler/package.json ./packages/crawler/

# Copy built code
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/crawler/dist ./packages/crawler/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Set working directory and expose port
WORKDIR /app/apps/api
EXPOSE 3001

# Start application
CMD ["node", "dist/index.js"]