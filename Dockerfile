# Stage 1: Builder - Installs deps, builds code
FROM node:20-slim AS builder

# Set environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_IGNORE_SIGNATURES=1 # Skip signature checks just in case

WORKDIR /app

# Install pnpm globally using npm (reliable method)
RUN corepack disable pnpm
RUN npm install -g pnpm@9.10.0 # Use your specific packageManager version

# Copy package manifests for the whole monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for each workspace package
# This allows pnpm to understand the workspace structure during install
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/crawler/package.json ./packages/crawler/
# Add any other packages if they exist

# Install ALL dependencies (including devDependencies needed for build)
# Using --frozen-lockfile is best practice for CI/CD
RUN pnpm install --frozen-lockfile

# Copy the entire monorepo source code
# This is simpler than copying individual files/dirs for the build stage
COPY . .

# Build the target application (@fedjobs/api) and its dependencies using Turbo
# Turbo will figure out what needs building based on the filter
RUN pnpm turbo run build --filter=@fedjobs/api...

# --- Optional: Prune dev dependencies ---
# If you want a smaller final image, remove dev dependencies AFTER building
# RUN pnpm prune --prod

# Stage 2: Runner - Creates the final production image
FROM node:20-slim AS runner

# Set environment variables for production
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm" # May not be strictly needed if not using pnpm in CMD
ENV PATH="$PNPM_HOME:$PATH" # May not be strictly needed

WORKDIR /app

# Copy ONLY the necessary production node_modules from the builder stage
# If you ran `pnpm prune --prod` above, this copies the pruned modules
COPY --from=builder /app/node_modules /app/node_modules

# Copy the built API application code
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
# Copy the API's package.json (needed for Node to find the main script)
COPY --from=builder /app/apps/api/package.json /app/apps/api/package.json

# Copy the built shared packages (dist folders) from the builder stage
# These contain the compiled JS needed by the running API
COPY --from=builder /app/packages/database/dist /app/packages/database/dist
COPY --from=builder /app/packages/types/dist /app/packages/types/dist
COPY --from=builder /app/packages/utils/dist /app/packages/utils/dist
COPY --from=builder /app/packages/crawler/dist /app/packages/crawler/dist
# Add other built packages if needed

# Set the final working directory to the API app's folder
WORKDIR /app/apps/api

# Expose the port the API listens on (adjust if different)
EXPOSE 3001

# Command to run the application
CMD ["node", "dist/index.js"]