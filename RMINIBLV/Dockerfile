# syntax=docker/dockerfile:1

FROM node:12.18.1
ENV NODE_ENV=production

WORKDIR  /duet-telegram

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

COPY RMINIBLV/.duetbot.json .duetbot.json
COPY RMINIBLV/.duetbotdb.json  .duetbotdb.json

CMD [ "node", "index.js" ]
