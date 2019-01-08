const sqlite3 = require('sqlite3');

const FEATURES_DB = "features.db";

const SQL_INIT_DB = `
CREATE TABLE IF NOT EXISTS Features (fid INTEGER PRIMARY KEY, fsrc TEXT, fcat TEXT, ftype TEXT, gtype TEXT, geometry TEXT, properties TEXT);
CREATE VIRTUAL TABLE FeatureTree USING rtree(fid, west, east, south, north);
CREATE VIRTUAL TABLE FeatureText USING fts5(name, title, body);
CREATE TRIGGER IF NOT EXISTS TrgDelFeature AFTER DELETE ON Features BEGIN 
	DELETE FROM FeatureText WHERE rowid = OLD.fid; 
	DELETE FROM FeatureTree WHERE fid = OLD.fid;
END
`;

var db;

function openDB()
{

    if (!db)
	{
		db = new sqlite3.Database(FEATURES_DB, dberr);
		db.exec(SQL_INIT_DB, (err)=>{ /*if (err) console.log(err);*/ });
	}
}

function dberr(err)
{
	if (err)
		console.log(`dberr: ${err}`);
}

openDB();

//Search('roche');

function Search(q, callback)
{
	let features = [];

	let featureCollection = {
		type: 'FeatureCollection',
		features: features
	};

	db.each('SELECT * FROM FeatureText, Features WHERE FeatureText.rowid = Features.fid AND title MATCH $q;',
		{
			$q: q
		},
		(err, row) =>
		{
            if (err)
            {
                console.error(err);
                return;
            }
            
			let feature = MakeGeoFeature(row);
			features.push(feature);
		},
		() => // complete
		{
            if (callback)
                callback(featureCollection);
            else
    			console.log(JSON.stringify(featureCollection, null, 4));
		}
	);
}

function MakeGeoFeature(row)
{
	let properties = JSON.parse(row.properties);

	let station = {
		id: `${row.fsrc}/${row.name}`,
		type: 'Feature',
		featureType: `${row.ftype}`,
		featureCat: `${row.fcat}`,
		geometry: {
			type: 'Point',
			coordinates: JSON.parse(row.geometry)
		},
		properties: properties
	};

	return station;
}

function BeginUpdate(source)
{
    db.exec('BEGIN TRANSACTION;');
    db.run('DELETE FROM Features WHERE fsrc = $fsrc;', { $fsrc: source });
}

function UpdateFeature(source, geo)
{
    db.run('INSERT INTO Features (fsrc, fcat, ftype, gtype, geometry, properties) VALUES ($fsrc, $fcat, $ftype, $gtype, $geometry, $properties);',
        {
            $fsrc: source,
            $fcat: geo.fcat,
            $ftype: geo.ftype,
            $gtype: geo.gtype,
            $geometry: JSON.stringify(geo.geometry),
            $properties: JSON.stringify(geo.properties)
        },
        function(err)
        {
            if (err)
            {
                console.error(err);
            }
            else
            {
                let fid = this.lastID;
                db.run('INSERT INTO FeatureText (rowid, name, title) VALUES ($fid, $name, $title);',
                    {
                        $fid: fid,
                        $name: geo.properties.name,
                        $title: geo.properties.title
                    }
                );

                // TODO: Also need to insert the point into FeatureTree
            }
        }
    );
}

function EndUpdate()
{
	db.exec('END TRANSACTION;');
}

exports.BeginUpdate = BeginUpdate;
exports.UpdateFeature = UpdateFeature;
exports.EndUpdate = EndUpdate;
exports.Search = Search;