'use strict'

var net = require('net');

function ais_feed(ws, req)
{
	let target_host = req.query['host'];
	let target_port = parseInt(req.query['port'], 10);

	if (!target_host || !target_port)
	{
		target_host = 'ais.rosepointnav.com';
		target_port = 10110;
	}

	var target = net.createConnection(target_port, target_host);

	target.on('data', (data) => {
		try
		{
			ws.send(data);
		}
		catch(e)
		{
			target.end();
			target.destroy();
		}
	});

	target.on('end', () => {
		ws.close();
		target.destroy();
	});

	target.on('error', () => {
		target.end();
		target.destroy();
		ws.close();
	});

/*
	ws.on('message', (msg) => {
		target.write(msg);
	});
*/

	ws.on('close', (code, reason) => {
		target.end();
		target.destroy();
	});

	ws.on('error', (a) => {
		target.end();
		target.destroy();
	});
}

exports.ais_feed = ais_feed;