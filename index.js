'use strict';

const {verifyUploadDir} = require('./lib/utils');
const db = require('./lib/db');
const notifications = require('./lib/notifications');
const context = require('./lib/context');
const DuetApi = require('./lib/api');
const Poller = require('./lib/poller');
const cli = require('./lib/cli');

async function start() {
	const {config, flags} = await cli();
	const duet = new DuetApi(config.url);
	const poller = new Poller(duet);
	const bot = require('./lib/bot')(config, duet);

	console.log('Connecting to duet...');
	await duet.connect();

	bot.catch(console.error);
	bot.context.db = db.init(flags.database, config.notificationDefaults);

	console.log('Checking for upload dir...');

	try {
		await verifyUploadDir(duet, config);
		bot.context.uploadsDisabled = false;
		console.log('Uploads enabled');
	} catch (err) {
		bot.context.uploadsDisabled = true;
		console.log(`Uploads disabled: ${err.message}`);
	}

	const baseCtx = context.create(bot.context, {telegram: bot.telegram});

	bot.startPolling();
	console.log('Bot started...');

	poller.on('statusEvent', (...args) => notifications.send(baseCtx, ...args));
	poller.on('printTime', (...args) => notifications.printTime(baseCtx, ...args));
	poller.on('printStarted', (...args) => notifications.printStarted(baseCtx, ...args));
	poller.on('printFinished', (...args) => notifications.printFinished(baseCtx, ...args));
	poller.on('console', (...args) => notifications.console(baseCtx, ...args));
	poller.on('error', (err) => console.log('Status poll failed', err));

	poller.start(config.pollInterval);
}


start().catch(console.error);
