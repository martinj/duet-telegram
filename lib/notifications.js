'use strict';
const dotProp = require('dot-prop');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const context = require('./context');
const sendStatus = require('./handlers/status');
// eslint-disable-next-line no-unused-vars
const commands = require('./handlers/commands');

const descriptions = exports.descriptions = {
	disabled: 'Disable all',
	printMinutes: 'Minute interval',
	updateAvailable: 'New bot version',
	console: 'Console',
	printStarted: 'Print started',
	printFinished: 'Print finished',
	flashing: 'Flashing firmware',
	off: 'Offline',
	halted: 'Halted',
	pausing: 'Pausing',
	paused: 'Paused',
	resuming: 'Resuming',
	simulating: 'Simulating',
	busy: 'Busy',
	changingTool: 'Chaning tool',
	idle: 'Idle',
	printing: 'Status changed to printing'
};

exports.defaults = {
	updateAvailable: true,
	console: true,
	printMinutes: 0,
	printStarted: true,
	printFinished: true,
	flashing: false,
	off: true,
	halted: true,
	pausing: true,
	paused: true,
	resuming: true,
	simulating: true,
	busy: false,
	changingTool: true,
	idle: false,
	printing: false
};

exports.send = (ctx, event, status) => {
	const chats = getChatsForEvent(ctx.db.get('chats'), event);
	chats.forEach((id) => sendStatus(context.createChatContext(ctx, id), status));
};

exports.console = async (ctx, msg, status) => {
	const {output} = status;
	const chats = getChatsForEvent(ctx.db.get('chats'), 'console');
	// eslint-disable-next-line camelcase
	let optionalParams = {parse_mode: 'HTML'};
	if (output) {
		const payload = `<b> !!! GCODE MSG !!! </b>\n<pre>${msg}</pre>`;
		if (output.msgBox.mode === 2) {
			optionalParams = {
				// eslint-disable-next-line camelcase
				parse_mode: 'HTML',
				// eslint-disable-next-line camelcase
				reply_markup: JSON.stringify({
					// eslint-disable-next-line camelcase
					inline_keyboard: [[{text: '👍 OK', callback_data: 'msgok'}]]
				})
			};
		} else if (output.msgBox.mode === 3) {
			optionalParams = {
				// eslint-disable-next-line camelcase
				parse_mode: 'HTML',
				// eslint-disable-next-line camelcase
				reply_markup: JSON.stringify({
					// eslint-disable-next-line camelcase
					inline_keyboard: [
						// eslint-disable-next-line camelcase
						[{text: '👍 OK', callback_data: 'msgok'},
							// eslint-disable-next-line camelcase
							{text: '🚫 Cancel', callback_data: 'msgcancel'}]
					]
				})
			};
		}
		chats.forEach((id) => ctx.telegram.sendMessage(id, payload, optionalParams));
	} else {
		const payload = `📺 Console message:\n<pre>${msg}</pre>`;
		chats.forEach((id) => ctx.telegram.sendMessage(id, payload, Extra.HTML()));
	}
};

exports.updateAvailable = (ctx, version) => {
	const chats = getChatsForEvent(ctx.db.get('chats'), 'updateAvailable');
	const url = 'https://github.com/martinj/duet-telegram';

	const payload =
		`💾 Version (${version}) of duet-telegram is available!\n` +
		'To upgrade run the following on your computer and restart your bot:\n' +
		'<pre>sudo npm i -g duet-telegram@latest</pre>\n\n' +
		`For more information see <a href="${url}">${url}</a>`;

	chats.forEach((id) => ctx.telegram.sendMessage(id, payload, Extra.HTML()));
};

exports.printStarted = (ctx, file) => {
	const chats = getChatsForEvent(ctx.db.get('chats'), 'printStarted');
	const reply = sendStatus.replyWithWebcam(`🖨️ Printing of ${file.fileName} started.`);
	chats.forEach((id) => reply(context.createChatContext(ctx, id)));
};

exports.printFinished = (ctx, file) => {
	const chats = getChatsForEvent(ctx.db.get('chats'), 'printFinished');
	const reply = sendStatus.replyWithWebcam(`🏁 Printing of ${file.fileName} finished.`);
	chats.forEach((id) => reply(context.createChatContext(ctx, id)));
};

exports.printTime = (ctx, started, currentFile, status) => {
	const elapsedMinutes = Math.trunc((new Date().getTime() - started) / 60000);
	const chats = getChatsWithPrintTime(ctx.db.get('chats'));

	chats.forEach((chat) => {
		const lastPrintTimeMinutes = dotProp.get(ctx.session, `${chat.id}.lastPrintTimeMinutes`, 0);
		if ((elapsedMinutes % chat.minutes) === 0 && elapsedMinutes !== lastPrintTimeMinutes) {
			dotProp.set(ctx.session, `${chat.id}.lastPrintTimeMinutes`, elapsedMinutes);
			sendStatus(context.createChatContext(ctx, chat.id), status, currentFile);
		}
	});
};

exports.change = (ctx) => {
	const current = ctx.db.get(`chats.${ctx.chat.id}.notifications`);
	const key = ctx.match[1];
	let value = current[key];
	const isBool = typeof (value) === 'boolean';
	const buttons = [];
	const newValue = Number(ctx.match[3]);

	if (!isNaN(newValue)) {
		if (isBool) {
			value = Boolean(newValue);
		} else {
			value += newValue;
			value = value < 0 ? 0 : value;
		}

		if (value === current[key]) {
			return;
		}
		ctx.db.set(`chats.${ctx.chat.id}.notifications.${key}`, value);
	}

	if (isBool) {
		buttons.push([
			Markup.callbackButton(value ? '🚫 Off' : '👍 On', `notification ${key} ${value ? 0 : 1}`)
		]);
	} else {
		buttons.push(numberButtons(['+1', '+5', '+15', '+30', '+60'], `notification ${key} `));
		buttons.push(numberButtons(['-1', '-5', '-15', '-30', '-60'], `notification ${key} `));
	}

	buttons.push([Markup.callbackButton('↩️ Back', 'notifications')]);

	return ctx.editMessageText(
		`*${descriptions[key]} is ${isBool ? (value ? '👍 On' : '🚫 Off') : value}*`,
		Extra.markdown().markup((m) => m.inlineKeyboard(buttons))
	);
};

function numberButtons(titles, actionPrefix) {
	return titles.map((title) => Markup.callbackButton(title, actionPrefix + title));
}

function getChatsForEvent(chats, event) {
	const res = [];
	for (const chat in chats) {
		const disabled = dotProp.get(chats[chat], 'notifications.disabled');
		if (dotProp.get(chats[chat], `notifications.${event}`) && !disabled) {
			res.push(chat);
		}
	}
	return res;
}

function getChatsWithPrintTime(chats) {
	const res = [];
	for (const chat in chats) {
		const disabled = dotProp.get(chats[chat], 'notifications.disabled');
		const minutes = dotProp.get(chats[chat], 'notifications.printMinutes');
		if (minutes && !disabled) {
			res.push({
				id: chat,
				minutes
			});
		}
	}
	return res;
}
