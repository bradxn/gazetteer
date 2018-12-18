FROM alpine

LABEL maintainer="brian@rosepoint.com"

RUN apk add --update nodejs nodejs-npm

COPY *.js /src/

COPY *.json /src/

WORKDIR  /src

RUN npm install https://github.com/mapbox/node-sqlite3/tarball/master

RUN npm install

EXPOSE 3000

ENTRYPOINT ["node", "./app.js"]
