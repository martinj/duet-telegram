'use strict';
const {formatDuration} = require('../utils');
const {basename} = require('path');
const request = require('request-prom');
// eslint-disable-next-line no-unused-vars
const tempstr = 'temp string';

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
			return ctx.replyWithHTML(message);
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
		`<b>PRINTING</b> ${basename(file.fileName)} at layer ${currentLayer}.\n` +
		`${tempStatus(status)}\n` +
		`${formatDuration(printDuration)}, ${fractionPrinted}% done, ${formatDuration(timesLeft.filament)} remaining.`
	)(ctx, status);
}

function tempStatus(status) {
	const {temps} = status;
	const {coords} = status;
	const {output} = status;
	const {params} = status;
	let ChamberSts = '';

	const currentTool = status.currentTool > -1 ? status.currentTool : 0;
	let dmsg = '';
	if (output) {
		dmsg = `==<b>Message:</b> ${output.msgBox.title}==\n${output.msgBox.msg}\n`;
	}

	const cpos = `X=${coords.xyz[0]} Y=${coords.xyz[1]} Z=${coords.xyz[2]}`;

	if (temps.hasOwnProperty('chamber')) {
		ChamberSts = `Chamber ${temps.chamber.current}/${temps.chamber.active}\n`;
	} else {
		ChamberSts = 'No chamber \n';
	}

	return `Bed ${temps.bed.current}/${temps.bed.active}\n` +
                `Extruder ${temps.current[currentTool + 1]}/${temps.tools.active[currentTool]}\n` +
			ChamberSts +
	//          `Chamber ${temps.chamber.current}/${temps.chamber.active}\n` +
                `${cpos}\n` +
                `Baby step:${params.babystep} Fan:${params.fanPercent[currentTool]}%\n` +
                `Speed:${params.speedFactor}% Extr:${params.extrFactors[currentTool]}%\n` +
                `${dmsg}`;
}

module.exports = (ctx, status, ...args) => {


	if (!statuses[status.status]) {
		return ctx.reply(`⚠️ Unknown status (${status.status})`);
	}


	return statuses[status.status](ctx, status, ...args);
};

module.exports.replyWithWebcam = replyWithWebcam;
module.exports.tempStatus = tempStatus;
