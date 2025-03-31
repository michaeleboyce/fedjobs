FROM node:20-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libwoff1 \
    libopus0 \
    libwebp7 \
    libwebpdemux2 \
    libenchant-2-2 \
    libgudev-1.0-0 \
    libsecret-1-0 \
    libhyphen0 \
    libgdk-pixbuf2.0-0 \
    libegl1 \
    libnotify4 \
    libxslt1.1 \
    libevent-2.1-7 \
    libgles2 \
    libvpx7 \
    libxcomposite1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libepoxy0 \
    libgtk-3-0 \
    libharfbuzz-icu0 \
    libxshmfence1 \
    libgbm1 \
    libnss3 \
    fonts-liberation \
    fonts-noto-color-emoji \
    libasound2 \
    libatspi2.0-0 \
    libcups2 \
    libxdamage1 \
    libdrm2 \
    libxkbcommon0 \
    libxrandr2 \
    libffi8 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libjpeg62-turbo \
    libsqlite3-0 \
    libxfixes3

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Copy ALL files including tsconfig
COPY . .

# Install dependencies (no frozen lockfile to help with circular dependencies)
RUN pnpm install --shamefully-hoist || (echo "pnpm install failed" && exit 1)

# Install Playwright and Puppeteer globally and then install browsers
RUN npm install -g playwright puppeteer
RUN playwright install --with-deps chromium
RUN npx puppeteer browsers install chrome

# Build packages in specific order to handle dependencies correctly
# First build the types package
RUN npx turbo run build --filter="@fedjobs/types"
# Then build database
RUN npx turbo run build --filter="@fedjobs/database"
# Then build utils
RUN npx turbo run build --filter="@fedjobs/utils"
# Then build crawler (depends on types, database and utils)
RUN npx turbo run build --filter="@fedjobs/crawler"
# Finally build the API
RUN npx turbo run build --filter="@fedjobs/api"

EXPOSE 3001
CMD ["sh", "-c", "pnpm --filter @fedjobs/api start"]
