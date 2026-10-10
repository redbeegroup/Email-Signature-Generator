FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY db ./db
COPY seeds ./seeds
COPY public ./public
EXPOSE 8080
USER node
CMD ["node", "src/server.js"]
