'use strict';
const moment = require('moment');

exports.dateSort = function (a, b) {
	a = new Date(a).getTime();
	b = new Date(b).getTime();

	if (a > b) {
		return -1;
	}

	if (a < b) {
		return 1;
	}

	return 0;
};

exports.typeSort = function (a, b) {
	if (a.type === 'f' && b.type === 'd') {
		return 1;
	}

	if (a.type === 'd' && b.type === 'f') {
		return -1;
	}

	return 0;
};

exports.formatDuration = function (sec) {
	return moment.utc(moment.duration(sec, 's').asMilliseconds()).format('HH:mm:ss');
};

exports.verifyUploadDir = async (duet, {uploadDir}) => {
	if (!uploadDir) {
		throw Error('No uploadDir set');
	}

	const dir = `/gcodes/${uploadDir}`;
	const res = await duet.listFiles(dir);

	if (res.err) {
		const mkRes = await duet.mkdir(dir);
		if (mkRes.err) {
			throw new Error(`Failed to create upload dir (${dir})`);
		}
	}
};
