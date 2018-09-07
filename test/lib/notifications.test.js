'use strict';

const moment = require('moment');
const expect = require('chai').expect;
const notifications = require('../../lib/notifications');
const helper = require('../helper');

describe('Notifications', () => {

	describe('Print Time Interval', () => {

		it('should send notification', (done) => {
			const started = moment().subtract(15, 'minutes').valueOf();
			const file = {fileName: 'foo.gcode'};
			const db = {
				chats: {
					123: {
						notifications: {
							printMinutes: 15
						}
					}
				}
			};
			const ctx = {
				config: {},
				db: helper.createDb(db),
				reply(msg) {
					expect(msg).to.equal('Printing foo.gcode at layer 2.\nBed 60/60, Extruder undefined/210.\n00:16:40, 10% done, 00:00:50 remaining.');
					done();
				}
			};

			notifications.printTime(ctx, started, file, helper.createStatus());
		});

	});

});
