'use strict';

const dotProp = require('dot-prop');
const statusTemplate = require('./fixtures/status.json');
const configTemplate = require('../config-template.json');

exports.createStatus = (status = 'P') => {
	return Object.assign({}, statusTemplate, {status});
};

exports.createDb = (obj = {}) => {
	const set = (...args) => dotProp.set(obj, ...args);
	const get = (...args) => dotProp.get(obj, ...args);
	const newChat = (chat) => set(`chats.${chat.id}`, Object.assign({}, chat, {notifications: configTemplate.notificationDefaults}));

	return {
		get,
		set,
		newChat
	};
};
