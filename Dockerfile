FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# The server is bundled into dist/server.js, so the runtime image needs no node_modules.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/app/data/wedding.db
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME /app/data
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "dist/server.js"]
