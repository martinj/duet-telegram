'use strict';

module.exports = (authorizedUsers) => (ctx, next) => {
	const type = ctx.updateType;
	if (
		authorizedUsers.indexOf(ctx.update[type].from.id) !== -1 ||
		(ctx.update.message && ctx.update.message.text === '/me')
	) {
		return next(ctx);
	} else {
		console.log('Unauthorized access from: ', ctx.chat);
	}

};
