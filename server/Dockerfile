# syntax=docker/dockerfile:1
# Node runs the TypeScript sources directly (type stripping), so there's no build step.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

# Litestream backs the SQLite file up to Tigris (see litestream.yml).
ARG LITESTREAM_VERSION=0.5.17
ADD --checksum=sha256:cfb371176d164437ae869f8351cfde49bd1804ae71c61923f75c9cba9c9c006d \
  https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-x86_64.tar.gz \
  /tmp/litestream.tar.gz
RUN tar -xzf /tmp/litestream.tar.gz -C /usr/local/bin litestream && rm /tmp/litestream.tar.gz

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY litestream.yml start.sh ./
COPY src ./src
EXPOSE 8080
CMD ["/app/start.sh"]
