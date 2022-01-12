# syntax=docker/dockerfile:1

FROM node:12.18.1
ENV NODE_ENV=production

WORKDIR  /duet-telegram

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

COPY ROTY_BLV/.duetbot.json .duetbot.json
COPY ROTY_BLV/.duetbotdb.json  .duetbotdb.json

CMD [ "node", "index.js" ]
