# shizurak-web —— Next 16 standalone 多阶段镜像（架构规范 §12）
# 基础镜像对齐集群 Node 22；corepack 锁定 pnpm 10.33.2（packageManager 字段）
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY src/app ./src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 安全审计 F-10：构建阶段即禁遥测（原先在 build 之后才设，匿名上报已发出）
ENV NEXT_TELEMETRY_DISABLED=1
# 生成主题 CSS（prebuild）+ standalone 产物
RUN pnpm build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -r app && useradd -r -g app app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER app
EXPOSE 3000
# /api/health 由部署侧 probe 使用（占位路由）
CMD ["node", "server.js"]
