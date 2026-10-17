# Google Cloud Run image: Express serves the API and the built SPA on $PORT.
FROM node:22.13-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22.13-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json tsconfig.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared
RUN mkdir -p data uploads_tmp && chown node:node data uploads_tmp
USER node
# Cloud Run injects PORT (default 8080).
ENV PORT=8080
EXPOSE 8080
CMD ["node_modules/.bin/tsx", "server/index.ts"]
