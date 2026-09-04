# ============================================================
# Dockerfile for Inequality Tycoon (คนละชั้น พลัส 60/40)
# Node.js 20 LTS (Alpine Linux - Lightweight & Secure)
# ============================================================

FROM node:20-alpine AS runner

# Set working directory inside container
WORKDIR /app

# Set default production environment variables
ENV NODE_ENV=production \
    PORT=3005

# Copy package manifests first to leverage Docker layer caching
COPY --chown=node:node package*.json ./

# Install only production dependencies cleanly
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY --chown=node:node . .

# Switch to non-root user for security
USER node

# Expose game server port
EXPOSE 3005

# Healthcheck to ensure HTTP server is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/api/server-info || exit 1

# Start the game server
CMD ["node", "server.js"]
