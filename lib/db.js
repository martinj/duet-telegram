'use strict';
const dotProp = require('dot-prop');
const {existsSync, writeFile, writeFileSync} = require('fs');

const defaults = {
	chats: {}
};

exports.init = (file, notificationDefaults) => {
	const db = createOrLoad(file);

	const set = (...args) => {
		dotProp.set(db, ...args);
		save();
		return db;
	};

	const get = (...args) => dotProp.get(db, ...args);
	const newChat = (chat) => set(`chats.${chat.id}`, Object.assign({}, chat, {notifications: notificationDefaults}));

	return {
		get,
		set,
		newChat
	};

	function save() {
		writeFile(file, JSON.stringify(db, null, 2), (err) => {
			if (err) {
				console.error(`Failed to save db (${file}), err: ${err.message}`);
			}
		});
	}
};

function createOrLoad(file) {
	if (existsSync(file)) {
		return require(file);
	}

	const db = Object.assign({}, defaults);
	writeFileSync(file, JSON.stringify(db, null, 2));
	return db;
}
