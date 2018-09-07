'use strict';

const Telegraf = require('telegraf');
const commands = require('./handlers/commands');
const fileBrowser = require('./handlers/filebrowser');

// eslint-disable-next-line max-statements
module.exports = (config, duet) => {
	const bot = new Telegraf(config.token);

	bot.context.duet = duet;
	bot.context.config = config;

	// middlewares
	bot.use(require('./middleware/auth')(config.authorizedUsers));

	bot.start(commands.start);

	// hears
	bot.hears(/\/gcode (.*)$/, commands.gcode);

	// commands
	bot.command('me', commands.me);
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
	bot.help(commands.help);

	// on
	bot.on('document', commands.document);

	// actions
	bot.action(/listfiles ([^\s]+)\s(\d+)$/, (ctx) => fileBrowser.list(ctx.match[1], Number(ctx.match[2]), 'printdialog')(ctx));
	bot.action('closefilelist', fileBrowser.close);
	bot.action(/printfile (.*)$/, commands.printFile);
	bot.action(/printdialog (.*)$/, commands.printDialog);
	bot.action(/macro (.*)$/, commands.execMacro);
	bot.action(/emergencystop (yes|cancel)$/, commands.emergencyStop);
	return bot;
};

