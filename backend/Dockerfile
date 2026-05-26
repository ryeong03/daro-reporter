FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN rm -f *.tsbuildinfo && npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
