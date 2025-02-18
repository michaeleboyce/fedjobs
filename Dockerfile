FROM node:20-slim

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Copy ALL files including tsconfig
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the API and its dependencies
RUN npx turbo run build --filter="@fedjobs/api..."

EXPOSE 3001
CMD ["sh", "-c", "pnpm --filter @fedjobs/api start"]
