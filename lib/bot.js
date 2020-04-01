'use strict';

const Telegraf = require('telegraf');
const session = require('telegraf/session');
const commands = require('./handlers/commands');
const fileBrowser = require('./handlers/filebrowser');
const notifications = require('./notifications');

// eslint-disable-next-line max-statements
module.exports = (config, duet) => {
	const bot = new Telegraf(config.token);

	bot.context.duet = duet;
	bot.context.config = config;

	// middlewares
	bot.use(session());
	bot.use(require('./middleware/auth')(config.authorizedUsers));
	bot.use(require('./middleware/error'));

	// hears
	bot.hears(/\/gcode (.*)$/, commands.gcode);
        bot.hears(/\/filsensor (.*)$/, commands.filsensor);
	// commands
	bot.command('status', commands.status);
	bot.command('upload', commands.upload);
	bot.command('files', commands.files);
	bot.command('print', commands.files);
	bot.command('togglepause', commands.togglePause);
	bot.command('cancel', commands.cancelPrint);
	bot.command('macros', commands.macros);
	bot.command('gcode', commands.gcode);
	bot.command('emergencystop', commands.emergencyStop);
	bot.command('shutup', commands.shutup);
	bot.command('dontshutup', commands.dontShutup);
	bot.command('notifications', commands.notifications);
        bot.command('filsensor', commands.filsensor);
	bot.help(commands.help);

	// on
	bot.on('document', commands.document);

	// actions
	bot.action(/listfiles ([^\s]+)\s(\d+)$/, (ctx) => fileBrowser.list(ctx.match[1], Number(ctx.match[2]), 'printdialog')(ctx));
	bot.action(/listmacros ([^\s]+)\s(\d+)$/, (ctx) => fileBrowser.list(ctx.match[1], Number(ctx.match[2]), 'macrodialog')(ctx));
    bot.action('closefilelist', fileBrowser.close);
	bot.action('printfile', commands.printFile);
    bot.action('execmacro', commands.execMacro);
	bot.action(/printdialog ([^\s]+)\s(\d+)$/, commands.printDialog);
    bot.action(/macrodialog ([^\s]+)\s(\d+)$/, commands.macroDialog);
	bot.action(/macro (.*)$/, commands.execMacro);
	bot.action(/emergencystop (yes|cancel)$/, commands.emergencyStop);
	bot.action('notifications', commands.notifications);
	bot.action(/notification (.*?)(\s(.*))?$/, notifications.change);
	bot.action('closedialog', commands.closeDialog);

	// catch unknown actions
	bot.on('text', commands.help);

	return bot;
};

