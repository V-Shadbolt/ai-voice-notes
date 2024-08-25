FROM node:18-slim
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential 
RUN mkdir -p /express/app
WORKDIR /express/app
COPY . .
RUN npm install
EXPOSE 3000
CMD [ "node", "server.js"]