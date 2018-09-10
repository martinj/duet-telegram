#!/usr/bin/env node
'use strict';

const fs = require('fs');
const {verifyUploadDir} = require('./lib/utils');
const db = require('./lib/db');
const notifications = require('./lib/notifications');
const context = require('./lib/context');
const DuetApi = require('./lib/api');
const OfflineError = DuetApi.OfflineError;
const Poller = require('./lib/poller');
const cli = require('./lib/cli');
const pkg = require('./package.json');
const updateNotifier = require('./lib/update-notifier')(pkg);

async function start() {
	const {config, flags} = await cli();
	const duet = new DuetApi(config.url);
	const poller = new Poller(duet);
	const bot = require('./lib/bot')(config, duet);

	console.log('Connecting to duet...');
	try {
		await duet.connect();
	} catch (err) {
		console.log('Duet is offline!');
	}

	bot.catch(console.error);
	bot.context.db = db.init(flags.database, config.notificationDefaults);

	migrateDefaults(bot.context.db, config, flags.config);

	console.log('Checking for upload dir...');

	try {
		await verifyUploadDir(duet, config);
		bot.context.uploadsDisabled = false;
		console.log('Uploads enabled');
	} catch (err) {
		bot.context.uploadsDisabled = true;
		console.log(`Uploads disabled: ${err.message}`);
	}

	const baseCtx = context.create(bot.context, {telegram: bot.telegram, session: {}});

	bot.startPolling();
	console.log('Bot started...');

	startPoller(poller, config, baseCtx);

	if (config.checkForUpdates) {
		updateNotifier(async (version, stop) => {
			await notifications.updateAvailable(baseCtx, version);
			console.log(`New version (${version}) available`);
			stop();
		});
	}
}

function startPoller(poller, config, baseCtx) {
	poller.on('statusEvent', (...args) => notifications.send(baseCtx, ...args));
	poller.on('printTime', (...args) => notifications.printTime(baseCtx, ...args));
	poller.on('printStarted', (...args) => notifications.printStarted(baseCtx, ...args));
	poller.on('printFinished', (...args) => notifications.printFinished(baseCtx, ...args));
	poller.on('console', (...args) => notifications.console(baseCtx, ...args));
	poller.on('error', (err) => {
		if (err instanceof OfflineError) {
			return;
		}

		console.log('Status poll failed', err);
	});

	poller.start(config.pollInterval);
}

function migrateDefaults(db, config, configPath) {
	const chats = db.get('chats');
	Object.keys(chats).forEach((id) => {
		const current = db.get(`chats.${id}.notifications`);
		db.set(`chats.${id}.notifications`, Object.assign({}, notifications.defaults, current));
	});

	config.notificationDefaults = Object.assign({}, notifications.defaults, config.notificationDefaults);
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); // eslint-disable-line no-sync
}

start().catch(console.error);
