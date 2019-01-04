const readline = require('readline');
const request = require('request');
const sqlite3 = require('sqlite3');

const SQL_INIT_DB = `
CREATE TABLE IF NOT EXISTS TideStations (id TEXT UNIQUE, info TEXT);
CREATE TABLE IF NOT EXISTS CurrentStations (id TEXT UNIQUE, info TEXT);
`;

var db;
function openDB()
{
	if (!db)
	{
        db = new sqlite3.Database(GNIS_DATA, (err) => {
            if (err)
                console.log(`Can't open database (${GNIS_DATA}) ${err}`);
		});
		db.run(SQL_INIT_DB);
        console.log(db);
    }
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

//tests...
//GetAndConvertCurrentFile('PCT1951_1', 2019);
//GetAndConvertTideFile('9440574', 2019);
//ConvertTideFile(process.stdin);

function GetTideStationList()
{
    request(
        {
            url: 'https://tidesandcurrents.noaa.gov/mdapi/latest/webapi/tidepredstations.json',
            json: true
        },
        function(error, response, json)
        {
            console.log(JSON.stringify(json, null, 4));
        }
    );
}

GetTideStationList();

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

request.get("https://tidesandcurrents.noaa.gov/noaacurrents/Stations?g=446", function(error, response, body) {
    let stations = GetCurrentStationList(body);
    console.log(JSON.stringify(stations, null, 4));
    console.log(`${stations.length} stations`);
});

function GetCurrentStationList(file)
{
    let stations = [];

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

        stations.push(station);
	}

	return stations;
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
