'use strict';

exports.createChatContext = (ctx, chatId) => {
	return Object.assign({
		reply: (...args) => ctx.telegram.sendMessage(chatId, ...args),
		replyWithPhoto: (...args) => ctx.telegram.sendPhoto(chatId, ...args)
	}, ctx);
};

exports.create = (...props) => Object.assign({}, ...props);

