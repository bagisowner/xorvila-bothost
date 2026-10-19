# Base Node.js Runtime for BotCloud Containers
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine

# Install build dependencies, ffmpeg for voice bots and git
RUN apk add --no-cache \
    curl \
    git \
    ffmpeg \
    python3 \
    make \
    g++ \
    bash

# Create non-root bot user
RUN addgroup -g 1000 botuser && \
    adduser -u 1000 -G botuser -s /bin/bash -D botuser

WORKDIR /server
RUN chown -R botuser:botuser /server

USER botuser
ENV NODE_ENV=production

CMD ["node", "index.js"]
