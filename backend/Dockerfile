FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production=true && npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
