const readline = require('readline');
const request = require('request');

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
