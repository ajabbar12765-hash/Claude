FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages --no-cache-dir yt-dlp

WORKDIR /app
COPY package.json package-lock.json ./

# Skip youtube-dl-exec's own binary download — we already installed yt-dlp
# above via pip, which server.js will detect and use instead.
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev

COPY . .

CMD ["node", "server.js"]
