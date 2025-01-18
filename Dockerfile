FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Copy ALL files including tsconfig
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the API and its dependencies
RUN npx turbo run build --filter=@fedjobs/api...

EXPOSE 3001
CMD ["pnpm", "--filter", "@fedjobs/api", "start"]