# Удалённый сервер yd-mcp: Streamable HTTP на порту 3000, секрет и токен — переменными
# окружения при запуске, в образ не попадают. Развёртывание — docs/deploy.md.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# prepare ставит git-хуки lefthook — в образе их нет и быть не должно.
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production YD_MCP_HOST=0.0.0.0 YD_MCP_PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/app/http.js"]
