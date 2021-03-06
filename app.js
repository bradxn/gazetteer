const gnisDb = require("./gnisDb");
const express = require('express');
const os = require('os');
const ais_feed = require("./ais_feed");
const features = require("./features");

const LISTEN_PORT = process.env.LISTEN_PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || 0.59;

const app = express();
var expressWs = require('express-ws')(app);

require("./noaa_tides_to_json").init(app);

app.get('/version', (req, res) => {
    const now = new Date();
    res.send(JSON.stringify(
        {
            "build": APP_VERSION,
            "host": os.hostname + '',
            "requestTime": now.toTimeString(),
            "user": os.userInfo.username
        }));
});

app.get('/gnis', (req, res) => {
    gnisDb.Search(req.query.q, (err, rows) => {
        res.send(JSON.stringify(rows, null, 4))
    });
});

app.get('/', (req, res) => {
    res.send("You've found nemo!");
});

app.get('/features', (req, res) => {
    features.Search(req.query.q, (geo) => {
        res.send(JSON.stringify(geo, null, 4))
    });
});

app.ws('/ais', ais_feed.ais_feed);

app.listen(LISTEN_PORT);


