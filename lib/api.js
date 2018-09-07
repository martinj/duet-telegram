'use strict';

const request = require('request-prom');
const attempt = require('attempt-promise');
const nRequest = require('request');
const debug = require('debug')('duetbot');

class API {

	constructor(url) {
		this.url = url.replace(/\/$/, '');
	}

	async connect() {
		let res;
		try {
			const url = `rr_connect?password=reprap&time=${encodeURIComponent(dateToStr(new Date()))}`;
			res = await this.request(url);
		} catch (err) {
			if (err instanceof request.ConnectionError) {
				throw new Error(`Connection to ${this.url} failed: ${err.message}`);
			}

			throw err;
		}

		if (res.err) {
			if (res.err === 1) {
				throw new Error('Unable to connect to duet: Invalid password.');
			}

			if (res.err === 2) {
				throw new Error('Unable to connect to duet: Not enough resources for new session.');
			}

			throw new Error('Unable to connect to duet (unknown error respose).');
		}
	}

	sendGCode(gcode) {
		return this.request(`rr_gcode?gcode=${encodeURIComponent(gcode)}`);
	}

	getReply() {
		return this.request('rr_reply', {json: false});
	}

	getStatus(type = 1) {
		return this.request(`rr_status?type=${type}`);
	}

	getFileInfo() {
		return this.request('rr_fileinfo');
	}

	listFiles(dir) {
		return this.request(`rr_filelist?dir=${encodeURIComponent('0:' + dir)}`);
	}

	mkdir(dir) {
		return this.request(`rr_mkdir?dir=${encodeURIComponent('0:' + dir)}`);
	}

	upload(url, path) {
		return new Promise((resolve, reject) => {
			const targetUrl = `${this.url}/rr_upload?name=${encodeURIComponent('0:' + path)}&time=${encodeURIComponent(dateToStr(new Date()))}`;
			const dest = nRequest.post(targetUrl);
			const source = nRequest.get(url);

			dest
				.on('response', (res) => {
					if (res.statusCode !== 200) {
						return reject(new request.ResponseError(`Request to ${targetUrl} failed. code: ${res.statusCode}`, res));
					}

					resolve(res);
				})
				.on('error', (err) => {
					reject(err);
				});

			source.pipe(dest);
		});
	}

	async request(path, options, returnResponse) {
		const opts = Object.assign({
			url: `${this.url}/${path}`,
			json: true
		}, options);

		const retry = {
			retries: 2,
			interval: 10,
			factor: 2,
			onError(err) {
				debug('request error', err);
			}
		};

		debug('request', {url: opts.url});

		const res = await attempt(retry, () => request(opts));
		if (returnResponse) {
			return res;
		}

		return res.body;
	}
}

// using same format as https://github.com/chrishamm/DuetWebControl
function dateToStr(date) {
	return `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}T${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

module.exports = API;
