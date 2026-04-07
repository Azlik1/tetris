# ==============================================
# 多阶段构建 - 构建阶段
# ==============================================
FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

# ==============================================
# 多阶段构建 - 生产镜像阶段
# ==============================================
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules

COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs app.js ./
COPY --chown=nodejs:nodejs modules/ ./modules/
COPY --chown=nodejs:nodejs utils/ ./utils/

# 注意：frontend 在构建上下文外，需在 docker-compose.yml 中单独挂载

USER nodejs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

CMD ["node", "app.js"]
