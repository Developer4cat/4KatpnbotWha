FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    python3 \
    python3-pip \
    fonts-liberation \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY . .

RUN mkdir -p temp auth_info db media_storage media_storage/pic media_storage/vo

ENV NODE_ENV=production
ENV py_cmd_img="python3 lib/converter/png.py"
ENV py_cmd_vid="python3 lib/converter/mp4.py"
ENV py_cmd_gif="python3 lib/converter/gif.py"
ENV py_cmd_pic="python3 lib/converter/pic.py"

EXPOSE 4000

CMD ["npm", "start"]
