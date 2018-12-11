const express = require('express');
const sqlite3 = require('sqlite3');

const port = 3000;
const appVersion = 0.56;
const app = express();

// Basically a liveness (cheap ping) endpoint (And a way to prove that a deployment worked :)) 
app.get('/version', (req, res) => {
    res.send(JSON.stringify(appVersion));
});

app.get('/gnis', gnisHandler);

app.get('/', (req, res) => {
    res.send("You've found nemo!");
});

app.listen(port);

function gnisHandler(req, res)
{
    gnisSearch(req.query.q, (err, rows) => {
       res.send(JSON.stringify(rows, null, 4))
    });
}

//TODO: modulize the db code
var db;
function openDB()
{
    if (!db)
    {
        db = new sqlite3.Database("test.db", (err) => {
            if (err)
                console.log(`Can't open database ${err}`);
        });
    }
}

function gnisSearch(q, callback)
{
    openDB();

    db.all(`SELECT * FROM National WHERE FEATURE_NAME LIKE '${q}%';`, [], callback);
}


/* This works too, but not as efficient when just returning everything...
    let results = [];
    db.each(`SELECT * FROM National WHERE FEATURE_NAME LIKE '${q}%';`, [], (err, row) => {
        if (err)
        {
            console.log(`SELECT error ${err}`);
        }
        else
        {
            results.push(row);
        }
    }, () => {
        // complete
        let json = JSON.stringify(results, null, 4);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(json);
    });
*/
