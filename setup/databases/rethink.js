var r = require('rethinkdbdash')({
	db: 'rest',
	discovery: true,
	buffer: 56,
	max: 999,
	timeout: 13,
	timeoutError: 1300,
	timeoutGb: 6000,
	silent: false
});
exports.rethink = r;
