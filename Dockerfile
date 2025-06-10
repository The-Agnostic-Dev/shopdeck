# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production PORT=5126
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/api/package.json ./api/
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/drizzle ./api/drizzle
COPY --from=build /app/web/dist ./web/dist
USER node
WORKDIR /app/api
EXPOSE 5126
CMD ["node", "dist/index.js"]
