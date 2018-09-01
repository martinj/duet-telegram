# Duet Telegram Bot

[Telegram](https://telegram.org/) bot for controlling and receiving notifications from a [Duet](https://www.duet3d.com/) electronics board.

This bot is inspired by [Octoprint-Telegram](https://github.com/fabianonline/OctoPrint-Telegram)

# Installation

1. Install [NodeJS](http://nodejs.org)
2. Install `duet-telegram`

		npm i -g duet-telegram

3. [Create Telegram Bot](#create-telegram-bot)

4. Start the bot by typing the command `duetbot`.

The first time you start it won't find any configuration, you will prompted to create an example configuration file.

Edit the configuration file (you can ignore `authorizedUsers` unless you know your telegram user id, see next step) and start the bot again.

**First time authorization**

Start a conversation with your bot in telegram and hit the start button, this will issue the command `/start`.

If you didn't know your telegram user id, this will now be logged in the console output for `duetbot.

Stop the bot and add your telegram user id in the confiuration file `authorizedUsers` and restart the bot.

Issue `/start` command once again in your bot conversation. If everything worked you should see an output in the console with `New chat added`.

You are now all set to start using the bot.


### Create Telegram Bot

1. Open a chat with [@botfather](http://telegram.me/botfather) in Telegram Messenger.

2. Send `/newbot` to @botfather and follow the instructions.

3. The botfather gives you a token, which you will need to use in the configuration for this software later on.

4. Send the available commands to botfather to enable auto-complete in the bot. Send `/setcommands` to botfather and select your created bot. Paste the commands in the box below (one message with multiple lines).


		status - Display current print status.
		upload - Upload gcode file.
		files - Browse gcode files.
		print - Alias for files.
		macros - Browse macros.
		togglepause - Pause/resume print.
		cancel - Cancel paused print.
		gcode - Send gcode to printer.
		emergencystop - A confirmation is required.
		shutup - Disables all automatic notifications.
		dontshutup - Enables all automatic notifications.
		help - Show this help message.


## Changing notification settings

All chats notification settings are available in the file `<HOME DIR>/.duetbotdb.json`, you can modify this file to change your settings. You will need to restart the bot for the configuration to be in effect.

There is plans on adding configuration support through the bot for this. See [TODO](#todo)

## TODO

- Add support for password protected duet
- Support notification changes using the bot
- Support paginated file listing responses
- Add small cache on file listings to improve speed
- Printer offline behaviour
- Respond to unknown commands with help
- Respect sessionTimeout from rr_connect

## Limitations

Some console / response message may be lost.
Apparently the data returned by `rr_reply` are flushed from duet, which means if duet web control is running it might fetch them before the bot does or vice versa.

Response from gcode commands requires console notifications enabled to see them.
