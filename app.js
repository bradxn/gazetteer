const url = require('url');
const http = require('http');
const sqlite3 = require('sqlite3'); 

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    let requrl = url.parse(req.url, true);
    if (requrl.pathname == "/gnis")
    {
        let results = search(res, requrl.query["q"]);
    }
    else
    {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end("That's not here!");
    }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

var db;

function openDB()
{
    if (!db)
    {
        db = new sqlite3.Database("test.db", (err) => {
            if (err)
                console.log(`Can't open database ${err}`);
            else
                console.log('Database is open!');
        });
    }
    else
    {
        console.log("Database is already open");
    }
}

function search(res, q)
{
    openDB();
    db.all(`SELECT * FROM National WHERE FEATURE_NAME LIKE '${q}%';`, [], (err, rows) => {
        if (err)
        {
            console.log(`SELECT error ${err}`);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/plain');
            res.end(err);
        }
        else
        {
            // complete
            let json = JSON.stringify(rows, null, 4);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end(json);
        }
    });

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
}