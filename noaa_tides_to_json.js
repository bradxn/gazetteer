const readline = require('readline');
const request = require('request');
const sqlite3 = require('sqlite3');
const features = require('./features');

const TIDE_DATA = "tides.db";

const SQL_INIT_DB = `
CREATE TABLE IF NOT EXISTS TideStations (id TEXT UNIQUE, properties TEXT);
CREATE TABLE IF NOT EXISTS CurrentStations (id TEXT UNIQUE, properties TEXT);
`;

var db;

function openDB()
{
	if (!db)
	{
		db = new sqlite3.Database(TIDE_DATA, dberr);
		db.exec(SQL_INIT_DB, (err)=>{ /*if (err) console.log(err);*/ });
	}
}

function dberr(err)
{
	if (err)
		console.log(`dberr: ${err}`);
}

openDB();
//GetTideStationList();
//GetCurrentStationList();

//GetTideStations();

//UpdateFeatures();

function init(app)
{
	app.get('/noaa_tides', (req, res) => {
		switch (req.query.cmd)
		{
		case 'upd_tides':
			GetTideStationList();
			break;
	
		case 'upd_currents':
			GetCurrentStationList();
			break;
		
		case 'upd_features':
			UpdateFeatures();
			break;
		}

		res.send("Working on it...");
	});
}

function UpdateFeatures()
{
	features.BeginUpdate();

	db.each('SELECT properties FROM TideStations;',
		(err, row) =>
		{
			if (err)
				return;
			
			let station = JSON.parse(row.properties);
			
			features.UpdateFeature("noaa_tides", {
				fcat: 'conditions',
				ftype: 'tide_station',
				gtype: 'point',
				geometry: [ station.lon, station.lat],
				properties: {
					name: station.stationId,
					title: station.etidesStnName,
					region: station.region,
					stationType: station.stationType,
					source: 'NOAA'
				}
			});
/*
			db.run('INSERT INTO Features (fcat, ftype, gtype, props) VALUES ($fcat, $ftype, $gtype, $props);',
				{
					$fcat: 'conditions',
					$ftype: 'tide_station',
					$gtype: 'point',
					$props: row.properties
				},
				function(err) {
					if (!err)
					{
						let fid = this.lastID;
						db.run('INSERT INTO FeatureText (rowid, name, title) VALUES ($fid, $name, $title);',
							{
								$fid: fid,
								$name: station.stationId,
								$title: station.etidesStnName
							}
						);
					}
				}
			);
*/
		},
		() => // complete
		{
			features.EndUpdate();
		}
	);
}

function MakeGeoFeature(properties)
{
	let json = JSON.parse(properties);

	let station = {
		id: `noaa_tides-${json.stationId}`,
		type: 'Feature',
		featureType: 'tide-station',
		featureCat: 'conditions',
		geometry: {
			type: 'Point',
			coordinates: [ json.lon, json.lat ]
		},
		properties: {
			name: json.stationId,
			title: json.etidesStnName,
			region: json.region,
			stationType: json.stationType,
			source: 'NOAA'
		}
	};

	return station;
}

function GetTideStations()
{
	let features = [];

	let featureCollection = {
		type: 'FeatureCollection',
		features: features
	};

	db.each('SELECT properties FROM TideStations;',
		(err, row) =>
		{
			if (err)
				return;
			
			let feature = MakeGeoFeature(row.properties);
			features.push(feature);
		},
		() => // complete
		{
			console.log(JSON.stringify(featureCollection, null, 4));
		}
	);
}


function GetAndConvertTideFile(station_id, year)
{
	let req = request.get(`https://tidesandcurrents.noaa.gov/cgi-bin/predictiondownload.cgi?&stnid=${station_id}&threshold=&thresholdDirection=greaterThan&bdate=${year}&timezone=GMT&datum=MLLW&clock=24hour&type=txt&annual=true`);

	ConvertTideFile(req);
}

function GetAndConvertCurrentFile(station_id, year)
{
	let req = request.get(`https://tidesandcurrents.noaa.gov/noaacurrents/CreateAnnual?id=${station_id}&year=${year}&fmt=txt&tz=GMT&u=1&t=24hr`);

	ConvertTideFile(req);
}

function GetTideStationList()
{
	request(
		{
			url: 'https://tidesandcurrents.noaa.gov/mdapi/latest/webapi/tidepredstations.json',
			json: true
		},
		function(error, response, json)
		{
				let stations = json.stationList;

				db.exec('BEGIN TRANSACTION;', dberr);

				for (let i = 0; i < stations.length; i += 1)
				{
					let station = stations[i];

					db.run('INSERT OR REPLACE INTO TideStations (id, properties) VALUES ($id, $properties);',
						{ $id: station.stationId, $properties: JSON.stringify(station) }, dberr);
				}

				db.exec('END TRANSACTION;', dberr);
		}
	);
}

function GetCurrentStationList()
{
	let noaa_current_regions = 
	[
		{
			name: 'Caribbean',
			g: 443
		},
		{
			name: 'East Coast',
			g: 444
		},
		{
			name: 'Gulf of Mexico',
			g: 445
		},
		{
			name: 'Pacific',
			g: 446
		},
		{
			name: 'West Coast',
			g: 447
		}
	];

	for (let i = 0; i < noaa_current_regions.length; i += 1)
	{
		request.get(`https://tidesandcurrents.noaa.gov/noaacurrents/Stations?g=${noaa_current_regions[i].g}`,
			function(error, response, body) {
				ParseCurrentStationList(body);
			}
		);
	}
}

function ParseCurrentStationList(file)
{
	db.exec('BEGIN TRANSACTION;', dberr);

	let ich = 0;
	for (;;)
	{
		let station = {};
		var ichStart;
		
		ich = file.indexOf("onmouseover='map(", ich);
		if (ich < 0)
			break;
		
		ich = file.lastIndexOf('<', ich);
		if (ich < 0)
			break;

		if (file.substr(ich, 3) == "<a ")
		{
			ich = file.indexOf("<a href='Predictions?id=", ich);
			if (ich < 0)
				break;
			ich += 24;
			ichStart = ich;
			ich = file.indexOf("'", ich);
			console.assert(ich >= 0);
			station.urlid = file.substr(ichStart, ich - ichStart);
		}
		else
		{
			console.assert(file.substr(ich, 5) == "<div ");
		}

		ich = file.indexOf('>', ich);
		console.assert(ich >= 0);
		ich += 1;
		ichStart = ich;
		ich = file.indexOf('<', ich);
		console.assert(ich >= 0);
		station.name = file.substr(ichStart, ich - ichStart);

		ich = file.indexOf("hidden-phone", ich);
		console.assert(ich >= 0);
		ich = file.indexOf('>', ich);
		console.assert(ich >= 0);
		ich += 1;
		ichStart = ich;
		ich = file.indexOf('<', ich);
		console.assert(ich >= 0);
		station.id = file.substr(ichStart, ich - ichStart);

		ich = file.indexOf("hidden-phone", ich);
		console.assert(ich >= 0);
		ich = file.indexOf('>', ich);
		console.assert(ich >= 0);
		ich += 1;
		ichStart = ich;
		ich = file.indexOf('<', ich);
		console.assert(ich >= 0);
		let strLat = file.substr(ichStart, ich - ichStart);

		ich = file.indexOf("hidden-phone", ich);
		console.assert(ich >= 0);
		ich = file.indexOf('>', ich);
		console.assert(ich >= 0);
		ich += 1;
		ichStart = ich;
		ich = file.indexOf('<', ich);
		console.assert(ich >= 0);
		let strLon = file.substr(ichStart, ich - ichStart);

		ich = file.indexOf("hidden-phone", ich);
		console.assert(ich >= 0);
		ich = file.indexOf('>', ich);
		console.assert(ich >= 0);
		ich += 1;
		if (file.substr(ich, 3) == "<b>")
			ich += 3;
		ichStart = ich;
		ich = file.indexOf('<', ich);
		console.assert(ich >= 0);
		station.type = file.substr(ichStart, ich - ichStart);

		let lat = parseFloat(strLat);
		let ch = strLat[strLat.length - 1];
		console.assert(ich >= 0);
		if (ch == 'S')
			lat = -lat;
		let lon = parseFloat(strLon);
		ch = strLon[strLon.length - 1];
		console.assert(ich >= 0);
		if (ch == 'W')
			lon = -lon;
		
		station.lat = lat;
		station.lon = lon;

		db.run('INSERT OR REPLACE INTO CurrentStations (id, properties) VALUES ($id, $properties);',
			{ $id: station.urlid, $properties: JSON.stringify(station) }, dberr);
	}
	
	db.exec('END TRANSACTION;', dberr);
}

function ConvertTideFile(inp)
{
	var bTideFile = false;
	var bCurrentFile = false;
	var bInHeader = true;

	var obj = { };

	const rl = readline.createInterface({
		input: inp,
		output: process.stdout,
		crlfDelay: Infinity,
		terminal: false
	});

	rl.on('line', (input) => {
		if (input == 'NOAA/NOS/CO-OPS')
		{
			bTideFile = true;
			return;
		}

		if (!bTideFile && !bCurrentFile) // TODO: Should have a better test
		{
			bCurrentFile = true;
		}

		if (bCurrentFile)
		{
			let a = input.match(/^\# ([^:]+):\s*(.*)$/);
			if (a)
			{
				let name = a[1].replace(/\s+/g, '_').toLowerCase();
				let value = a[2];

				switch (name)
				{
				case 'source':
				case 'disclaimer':
				case 'product_type':
				case 'from':
					return; // ignore these

				case 'latitude':
				case 'longitude':
				case 'mean_flood_dir':
				case 'mean_ebb_dir':
					value = parseFloat(value);
					break;

				case 'depth':
					if (value == 'Unknwon')
						value = null;
					break;
				}
				
				obj[name] = value;
			}
			else
			{
				a = input.match(/^(\S+) (\S+)\s+(\S+)\s+(\S+)$/);
				if (a)
				{
					let p = {
						t: `${a[1]}T${a[2]}Z`,
						e: a[3],
						v: a[4]
					};

					if (p.v == '-')
						delete p.v;
					else
						p.v = parseFloat(p.v);

					if (!obj.predictions)
						obj.predictions = [];
					obj.predictions.push(p);
				}
			}
		}
		else if (bTideFile)
		{
			if (input == "")
			{
				bInHeader = false;
				return;
			}

			if (bInHeader)
			{
				if (input == 'Annual Tide Predictions')
					return;

				let a = input.match(/^([^:]+):\s*(.*)$/);
				if (a)
				{
					let name = a[1];
					let value = a[2];

					switch (name)
					{
					case 'Disclaimer':
					case 'From':
					case 'Units':
					case 'Time Zone':
					case 'Datum':
					case 'Interval Type':
						return;

					case 'StationName':
						name = 'name';
						break;

					case 'ReferencedToStationName':
						name = 'refName';
						break;

					case 'ReferencedToStationId':
						name = 'refID';
						break;

					case 'HeightOffsetLow':
						name = 'HL';
						value = parseFloat(value.replace('+ ', ''));
						break;

					case 'HeightOffsetHigh':
						name = 'HH';
						value = parseFloat(value.replace('+ ', ''));
						break;

					case 'TimeOffsetLow':
						name = 'TL';
						value = parseFloat(value);
						break;
					
					case 'TimeOffsetHigh':
						name = 'TH';
						value = parseFloat(value);
						break;

					case 'Prediction Type':
						name = 'type';
						value = value.substr(0, 1);
						break;
					}
					
					obj[name] = value;
				}
			}
			else
			{
				let a = input.match(/^(\S+)\s+\S+\s+(\S+)\s+(\S+)\s+\S+\s+(\S+)$/);
				if (a)
				{
					if (a[1] == 'Date')
						return; // this is the header line
					
					let p = {
						t: `${a[1].replace(/\//g, '-')}T${a[2]}Z`,
						e: a[4],
						v: parseFloat(a[3])
					};

					if (!obj.predictions)
						obj.predictions = [];
					obj.predictions.push(p);
				}
			}
		}
	});

	rl.on('close', () => {
		console.log(JSON.stringify(obj, null, 4));
	});
}

exports.default = init;
exports.init = init;
