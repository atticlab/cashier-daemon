FROM node:7.2

ADD ./app /app

WORKDIR /app
RUN npm install

EXPOSE 8080
CMD ["node", "server.js"]
