'use strict';
const {formatDuration} = require('../utils');
const {basename} = require('path');
const request = require('request-prom');
var  tempstr= "temp string" ;

const statuses = {
	F: ({reply}) => reply('⚡ Flashing firmware ⚡'),
	O: ({reply}) => reply('☠️ Printer is off ☠️'),
	H: ({reply}) => reply('☠️ Printer halted ☠️'),
	D: replyWithWebcam('⚠️ Pausing'),
	S: replyWithWebcam('ℹ️ Paused'),
	R: replyWithWebcam('⚠️ Resuming'),
	M: ({reply}) => reply('🙌 Simulating'),
	B: replyWithWebcam('⚠️ Busy'),
	T: replyWithWebcam('ℹ️ Changing Tool'),
	I: replyWithWebcam('PRINTER IDLE '),
	P: printing
};

function replyWithWebcam(message) {
	return async (ctx, status) => {
		let caption;
		if (message instanceof Function) {
			caption = await message(ctx, status);
		} else {
			caption = message;
		}

		const {webcamSnapshotUrl} = ctx.config;
		if (!webcamSnapshotUrl) {
			return ctx.reply(message);
		}

		return ctx.replyWithPhoto(
			{source: request.stream({url: webcamSnapshotUrl})},
			{caption}
		);
	};
}

async function printing(ctx, status, file) {
	const {
		currentLayer,
		printDuration,
		fractionPrinted,
		timesLeft
	} = status;

	return replyWithWebcam(
		`Printing ${basename(file.fileName)} at layer ${currentLayer}.\n` +
		`${tempStatus(status)}\n` +
		`${formatDuration(printDuration)}, ${fractionPrinted}% done, ${formatDuration(timesLeft.filament)} remaining.`
	)(ctx, status);
}

function tempStatus(status) {
	const {temps} = status;
    const {coords} = status;
	const currentTool = status.currentTool > -1 ? status.currentTool : 0;
    let cpos = `X=${coords.xyz[0]}\nY=${coords.xyz[1]}\nZ=${coords.xyz[2]}\n`;
  
	return `Bed ${temps.bed.current}/${temps.bed.active}\nExtruder ${temps.current[currentTool + 1]}/${temps.tools.active[currentTool]}\nChamber ${temps.chamber.current}/${temps.chamber.active}\n${cpos}.`;
}

module.exports = (ctx, status, ...args) => {

	
       if (!statuses[status.status]) {
		return ctx.reply(`⚠️ Unknown status (${status.status})`);
	}
 

	return  statuses[status.status](ctx, status, ...args);
};

module.exports.replyWithWebcam = replyWithWebcam;
