FROM node:20-slim

WORKDIR /app

ENV PYTHON=/usr/bin/python3

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]