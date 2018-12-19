const sqlite3 = require('sqlite3');

//  TODO: Currently default to the production path. Should invert this default to the dev path?
const GNIS_DATA = process.env.GNIS_DATA || "/gnis-data/test.db";

var db;
function openDB() {
    if (!db) {
        db = new sqlite3.Database(GNIS_DATA, (err) => {
            if (err)
                console.log(`Can't open database (${GNIS_DATA}) ${err}`);
        });
        console.log(db);
    }
}

function Search(q, callback) {
    openDB();
    db.all(`SELECT * FROM National WHERE FEATURE_NAME LIKE '${q}%';`, [], callback);
}

exports.Search = Search;
