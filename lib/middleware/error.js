'use strict';
const OfflineError = require('../api').OfflineError;

module.exports = (ctx, next) => {
	return next(ctx).catch((err) => {
		if (err instanceof OfflineError) {
			return ctx.reply('Duet is unreachable');
		}

		throw err;
	});
};
