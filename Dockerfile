FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY shared ./shared
COPY scripts/build.mjs ./scripts/build.mjs
COPY server.mjs ./server.mjs
RUN npm run build
ENV HOST=0.0.0.0
ENV PORT=3333
EXPOSE 3333
USER node
CMD ["node", "server.mjs"]
