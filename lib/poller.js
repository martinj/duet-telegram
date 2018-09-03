'use strict';
const EventEmitter = require('events');

const statusEventMap = {
	F: 'flashing',
	O: 'off',
	H: 'halted',
	D: 'pausing',
	S: 'paused',
	R: 'resuming',
	M: 'simulating',
	B: 'busy',
	T: 'changingTool',
	I: 'idle',
	P: 'printing'
};

class Poller extends EventEmitter {

	constructor(duet) {
		super();
		this.lastStatus = null;
		this.duet = duet;
		this.printTimerId = null;
		this.printStarted = null;
	}

	start(interval = 5000) {
		this.interval = interval;
		this.poll();
	}

	async poll() {
		try {
			await this.update();
		} catch (err) {
			this.emit('error', err);
		}

		setTimeout(() => {
			this.poll();
		}, this.interval);
	}

	async update() {
		const status = await this.duet.getStatus(3);

		if (!this.lastStatus) { // first poll
			if (status.status === 'P') {
				this.startPrintTimer();
			}

			this.lastStatus = status;
			return;
		}

		if (this.lastStatus.status === status.status) {

			// console message might be available
			if (this.lastStatus.seq !== status.seq) {
				try {
					const msg = await this.duet.getReply();
					if (msg && msg.trim()) {
						// messages is flused after retrieval, so it might be empty if DWC have retrieved it
						this.triggerEvent('console', msg);
					}
				} catch (err) {
					this.emit('error', err);
				}
			}

			this.lastStatus = status;
			return;
		}

		// Status has changed
		await this.statusChanged(status);

		this.lastStatus = status;
	}

	async statusChanged(status) {
		if (status.status === 'P') {
			// print started
			await this.startPrintTimer();
			try {
				this.triggerEvent('printStarted', this.currentFile, status);
			} catch (err) {
				this.emit('error', err);
			}
		} else if (this.lastStatus.status === 'P' && status.status === 'I') {
			// print finished
			this.triggerEvent('printFinished', this.currentFile, status);
			this.stopPrintTimer();
		}

		this.triggerEvent('statusEvent', statusEventMap[status.status], status);
	}

	triggerEvent(event, ...args) {
		try {
			this.emit(event, ...args);
		} catch (err) {
			err.message = `${event} error: ` + err.message;
			this.emit('error', err);
		}
	}

	async startPrintTimer() {
		this.printStarted = new Date().getTime();
		try {
			this.currentFile = await this.duet.getFileInfo();
		} catch (err) {
			this.emit('error', err);
		}
		this.printTimerId = setInterval(() => {
			this.emit('printTime', this.printStarted, this.lastStatus);
		}, 60000).unref();
	}

	stopPrintTimer() {
		clearInterval(this.printTimerId);
		this.printStarted = null;
		this.currentFile = null;
	}
}


module.exports = Poller;
