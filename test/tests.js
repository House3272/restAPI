/*
mocha tests
*/

var coMocha = require('co-mocha');
var assert = require('assert');


var re = require('../setup/apiFunctions');
console.log(re);

var testGuy = {
	username:'testguy',
	displayName:'TestGuy',
	email:'testguy@test.com',
	pswd:'testpassword',
};


describe('User', function() {
	describe('Create', function * () {
		it('should return a user obj like testGuy', function() {
			var attempt = yield re.newUser(reqBody);
			assert.equal(attempt, testGuy);
		});
	});
});