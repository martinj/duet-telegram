'use strict';

const latestVersion = require('latest-version');
const semver = require('semver');

module.exports = (pkg, interval = 86400000) => (callback) => {
	const id = setInterval(async () => {
		const version = await latestVersion(pkg.name);
		if (semver.gt(version, pkg.version)) {
			return callback(version, stop);
		}
	}, interval).unref();

	const stop = () => {
		clearInterval(id);
	};

	return stop;
};
