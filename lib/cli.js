/* eslint no-sync: off */
'use strict';

const os = require('os');
const fs = require('fs');
const meow = require('meow');
const inquirer = require('inquirer');

const cli = meow(`
	Usage
	  $ duetbot

	Options
	  --config, -c  configuration file
	  --database, -d database file

	Examples
	  $ duetbot

`, {
	booleanDefault: undefined,
	flags: {
		config: {
			type: 'string',
			default: `${os.homedir()}/.duetbot.json`,
			alias: 'c'
		},
		database: {
			type: 'string',
			default: `${os.homedir()}/.duetbotdb.json`,
			alias: 'd'
		}
	}
});

async function start() {
	return {
		config: await loadConfig(cli.flags.config),
		flags: cli.flags
	};
}

async function loadConfig(path) {
	try {
		const conf = require(path);
		conf.authorizedUsers = conf.authorizedUsers.filter(Number).map(Number);
		return conf;
	} catch (err) {
		if (err instanceof SyntaxError) {
			exit(`Invalid syntax found in (${path}). You can use https://jsonlint.com/ to validate it.`);
		}

		console.log(`Unable to load configuration file (${path})`);

		const answers = await inquirer.prompt([{
			type: 'confirm',
			name: 'create',
			message: `Create example config file at ${path}?`,
			default: true
		}]);

		if (!answers.create) {
			return exit('');
		}

		fs.copyFileSync(`${__dirname}/../config-template.json`, path);
		console.log();
		console.log(`Example config created at ${path}. Be sure to edit the values in it and start the bot again.`);
		exit('');
	}
}

function exit(msg) {
	console.log(msg);
	process.exit(-1);
}

module.exports = start;
