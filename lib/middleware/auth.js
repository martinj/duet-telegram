'use strict';

module.exports = (authorizedUsers) => (ctx, next) => {
	const type = ctx.updateType;
	if (authorizedUsers.indexOf(ctx.update[type].from.id) !== -1) {
		const chat = ctx.db.get(`chats.${ctx.chat.id}`);
		if (!chat) {
			console.log('New chat for authorized user created', ctx.chat);
			ctx.db.newChat(ctx.chat);
		}

		return next(ctx);
	} else {
		console.log('Unauthorized access from: ', ctx.chat);
	}

};
