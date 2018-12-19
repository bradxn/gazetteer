const gnisDb = require("./gnisDb");
const express = require('express');
const os = require('os');

const LISTEN_PORT = process.env.LISTEN_PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || 0.59;

const app = express();

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

app.listen(LISTEN_PORT);


