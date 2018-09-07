'use strict';

const Markup = require('telegraf/markup');
const Extra = require('telegraf/extra');
const {basename} = require('path');
const {dateSort, typeSort} = require('../utils');

exports.list = (path, page, command, messageId) => async (ctx) => {
	const data = await ctx.duet.listFiles(path);
	const files = sort(data.files);

	const {message, keyboard} = createKeyboard(files, command, path, page || 1);

	if (ctx.updateSubTypes[0] === 'text') {
		if (messageId) {
			await ctx.deleteMessage(messageId);
		}
		return ctx.reply(message, keyboard);
	}

	return ctx.editMessageText(message, keyboard);
};

exports.close = (ctx) => {
	ctx.editMessageText('Maybe next time.');
};

exports.createPrintDialog = (file, btns) => {
	const yesNo = [
		Markup.callbackButton('👍 Yes', `printfile ${file}`),
		Markup.callbackButton('🚫 No', 'closefilelist')
	];

	const buttons = btns ? [yesNo, btns] : yesNo;

	return [
		`Do you want to print ${basename(file)}`,
		Extra.HTML().markup((m) => m.inlineKeyboard(buttons))
	];
};

function sort(files) {
	return files.sort((a, b) => dateSort(a.date, b.date)).sort(typeSort);
}

function createKeyboard(files, command, path, page) {
	const maxFiles = 10;
	const isFirstPage = page === 1;
	const pages = Math.ceil(files.length / maxFiles) || 1;
	const isLastPage = page === pages;
	const startIdx = (page - 1) * 10;
	const dirs = path.split('/').splice(1);

	const buttons = [];

	for (let i = startIdx; i <= startIdx + maxFiles && i < files.length; i = i + 2) {
		const pair = [createFileButton(path, files[i], command)];
		if (files[i + 1]) {
			pair.push(createFileButton(path, files[i + 1], command));
		}
		buttons.push(pair);
	}

	const stepButtons = [];

	if (!isFirstPage) {
		stepButtons.push(Markup.callbackButton('⬅️', `listfiles ${path} ${page - 1}`));
	}

	if (!isLastPage) {
		stepButtons.push(Markup.callbackButton('➡️', `listfiles ${path} ${page + 1}`));
	}

	const footer = [Markup.callbackButton('🚫 Close', 'closefilelist')];
	if (dirs.length > 1) {
		footer.splice(0, 0, Markup.callbackButton('↩️ Back', `listfiles /${dirs[dirs.length - 2]} 1`));
	}

	buttons.push(stepButtons);
	buttons.push(footer);

	return {
		message: `🗄 Files in ${path} [${page}/${pages}]`,
		keyboard: Extra.HTML().markup((m) => m.inlineKeyboard(buttons))
	};
}

function createFileButton(path, file, command) {
	const isDir = file.type === 'd';
	let icon = '';
	let cmd = `${command} ${path}/${file.name}`;

	if (isDir) {
		icon = '📁';
		cmd = `listfiles ${path}/${file.name} 1`;
	}

	return Markup.callbackButton(icon + file.name, cmd);
}
