'use strict';

const request = require('request-prom');
const status = require('./status');
const fileBrowser = require('./filebrowser');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const {basename} = require('path');
const OfflineError = require('../api').OfflineError;
const notifications = require('../notifications');

exports.status = async (ctx) => {
	try {
	  const res = await ctx.duet.getStatus(3);

          const {temps} = res;
          const {coords} = res;  
	      const currentTool = res.currentTool > -1 ? res.currentTool : 0;
 	      let verbstat = "?";
          if (res.status ==='O') verbstat = "PRINTER OFF"
          else if (res.status ==='H') verbstat = "PRINTER HALTED "
          else if(res.status ==='D') verbstat = "PRINTER PAUSING"
          else if(res.status ==='S') verbstat = "PRINTER PAUSED"
          else if(res.status ==='R') verbstat = "PRINTER RESUMING"
          else if(res.status ==='M') verbstat = "PRINTER SIMULATING"
          else if(res.status ==='B') verbstat = "PRINTER BUSY"
          else if(res.status ==='T') verbstat = "PRINTER TOOL CHG"   
          else if (res.status ==='I') verbstat = "PRINTER IDLE";  
          let cpos = `Position X=${coords.xyz[0]},Y=${coords.xyz[1]},Z=${coords.xyz[2]}`;  
	      const returnstr =  `${verbstat} \n ${cpos}\n Bed ${temps.bed.current}/${temps.bed.active},\n Extruder ${temps.current[currentTool + 1]}/${temps.tools.active[currentTool]},\n Chamber ${temps.chamber.current}/${temps.chamber.active}.`;

          if (verbstat !="?") {
 
                return status.replyWithWebcam(returnstr)(ctx);
          } else
		     return status(ctx, res, res.status === 'P' && await ctx.duet.getFileInfo());
	} catch (err) {
		if (err instanceof OfflineError) {
			return status.replyWithWebcam('⚠️ Duet is unreachable!')(ctx);
		}

		throw err;
	}
};

exports.upload = (ctx) => {
	if (ctx.uploadsDisabled) {
		return ctx.reply('Uploads are disabled, check your config or bot output.');
	}

	return ctx.reply(`To upload a GCode file just send it.\nIt will be stored in '${ctx.config.uploadDir}' folder.`);
};

exports.document = async (ctx) => {
	if (ctx.uploadsDisabled) {
		return ctx.reply('Uploads are disabled, check your config or bot output.');
	}

	const doc = ctx.update.message.document;
	const url = await ctx.telegram.getFileLink(doc.file_id);
	const filePath = `/gcodes/${ctx.config.uploadDir}/${doc.file_name}`;

	try {
		await ctx.duet.upload(url, filePath);
	} catch (err) {
		if (err instanceof request.ResponseError) {
			return ctx.reply(err.message);
		}

		return ctx.reply('Upload failed: ' + err.message);
	}

	ctx.session.selectedFile = filePath;
	return ctx.reply(...fileBrowser.createPrintDialog(doc.file_name));
};

exports.printDialog = async (ctx) => {
	const dir = ctx.match[1];
	const fileId = ctx.match[2];
	const back = Markup.callbackButton('↩️ Back', `listfiles ${dir} 1`);
	const file = await ctx.duet.getFileById(dir, fileId);
	ctx.session.selectedFile = `${dir}/${file.name}`;

	const dialog = fileBrowser.createPrintDialog(file.name, [back]);

	return ctx.editMessageText(...dialog);
};


exports.macroDialog = async (ctx) => {
        const dir = ctx.match[1];
        const fileId = ctx.match[2];
        const back = Markup.callbackButton('↩️ Back', `listfiles ${dir} 1`);
        const file = await ctx.duet.getFileById(dir, fileId);
        ctx.session.selectedFile = `${dir}/${file.name}`;

        const dialog = fileBrowser.createMacroDialog(file.name, [back]);

        return ctx.editMessageText(...dialog);
};

exports.gcode = async (ctx) => {
	if (!ctx.match) {
		return ctx.reply('Please enter the gcode after the command e.g /gcode G28');
	}

	const gcode = ctx.match[1];
	await ctx.duet.sendGCode(gcode);
	return ctx.reply('Command sent.');
};

exports.filsensor = async (ctx) => {
        let vgcode = "M591";
        var  param =  "???"; 
        if (!ctx.match) {
                vgcode = "M591 D0";
        } else  {
          param = ctx.match[1];  
          if (ctx.match[1] == 'on') vgcode = "M591 D0 S1 M591 D0"
          else  if  (ctx.match[1] == 'off') vgcode = "M591 D0 S0 M591 D0";
        }

        const gcode = vgcode;
        await ctx.duet.sendGCode(gcode);
        return ctx.reply(`Command sent.: ${gcode} par:${param} ` );
};


exports.files = async (ctx) => {
	const res = await ctx.reply('Loading files...');
	fileBrowser.list('/gcodes', 1, 'printdialog', res.message_id)(ctx);
};

exports.macros = async (ctx) => {
	const res = await ctx.reply('Loading macros...');
	fileBrowser.listmacro('/macros', 1, 'macrodialog', res.message_id)(ctx);
};

exports.printFile = async (ctx) => {
	const file = ctx.session.selectedFile;
	if (!file) {
		return ctx.editMessageText('No file was selected.');
	}

	await ctx.duet.sendGCode(`M32 "${file}"`);
	ctx.editMessageText(`Printing ${file}.`);
};

exports.togglePause = async (ctx) => {
	const res = await ctx.duet.getStatus(3);
	if (res.status !== 'P' && res.status !== 'S' && res.status !== 'D') {
		return ctx.reply('No print active or paused.');
	}
	if (res.status === 'P') {
		await ctx.duet.sendGCode('M25');
		return ctx.reply('Pausing print...');
	}

	await ctx.duet.sendGCode('M24');
	return ctx.reply('Resuming print...');
};

exports.cancelPrint = async (ctx) => {
	const res = await ctx.duet.getStatus(3);
	if (res.status !== 'S') {
		return ctx.reply('Print needs to be paused first. Use /togglepause.');
	}

	await ctx.duet.sendGCode('M0');
	return ctx.reply('Canceling print...');
};

exports.execMacro = async (ctx) => {
	const file = ctx.session.selectedFile;
        if (!file) {
                return ctx.editMessageText('No file was selected.');
        }

	await ctx.duet.sendGCode(`M98 P"${file}"`);
	return ctx.reply(`Executing macro ${basename(file)}.`);
};

exports.emergencyStop = async (ctx) => {
	if (!ctx.match) {
		return ctx.replyWithMarkdown('*Are you sure?*',
			Markup.inlineKeyboard([
				Markup.callbackButton('👍 Yes', '/emergencystop yes'),
				Markup.callbackButton('🚫 Cancel', '/emergencystop cancel')
			]).extra()
		);
	}

	if (ctx.match[1] === 'yes') {
		await ctx.duet.sendGCode('M112\nM999');
		return ctx.editMessageText('Command sent.');
	}

	if (ctx.match[1] === 'cancel') {
		return ctx.editMessageText('Maybe next time.');
	}
};

exports.shutup = (ctx) => {
	ctx.db.set(`chats.${ctx.chat.id}.notifications.disabled`, true);
	ctx.reply('Ok. I will shutup.');
};

exports.dontShutup = (ctx) => {
	ctx.db.set(`chats.${ctx.chat.id}.notifications.disabled`, false);
	ctx.reply('Automatic notifications are enabled.');
};

exports.notifications = (ctx) => {
	const current = ctx.db.get(`chats.${ctx.chat.id}.notifications`);

	const buttons = [];
	let currentPair = [];

	Object.keys(current).forEach((key, idx) => {
		if (idx % 2 === 0) {
			buttons.push(currentPair);
			currentPair = [];
		}

		const title = notifications.descriptions[key];
		const value = typeof (current[key]) === 'boolean' ? (current[key] ? '(👍 On)' : '(🚫 Off)') : current[key];

		currentPair.push(Markup.callbackButton(`${title} ${value}`, `notification ${key}`));
	});

	if (currentPair.length) {
		buttons.push(currentPair);
	}

	buttons.push([Markup.callbackButton('Done', 'closedialog')]);

	const reply = ctx.updateType === 'callback_query' ? ctx.editMessageText : ctx.reply;
	return reply('*Your notification settings*', Extra.markdown().markup((m) => m.inlineKeyboard(buttons)));
};

exports.closeDialog = (ctx) => ctx.deleteMessage(ctx.update.callback_query.message.message_id);

exports.help = (ctx) => {
	const msg = `
ℹ️ *The following commands are known:*

/status - Display current print status.
/filsensor - on/off check/on/off filament sensor
/upload - Upload gcode file.
/files - Browse gcode files.
/print - Alias for files.
/macros - Browse macros.
/togglepause - Pause/resume print.
/notifications - Show/Change your notification settings.
/cancel - Cancel paused print.
/gcode - Send gcode to printer.
/emergencystop - A confirmation is required.
/shutup - Disables all automatic notifications.
/dontshutup - Enables all automatic notifications.
/help - Show this help message.
`;

	return ctx.reply(msg, Extra.markdown());
};
