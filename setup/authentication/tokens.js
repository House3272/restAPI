var jwt = require('jsonwebtoken'); 


// token key
var tokenKey = require('../../../tokenkey');
//issuing domain
var domain = "rest.frosation.com";
// time-to-death in seconds (minute * 60)
var ttd = 30*60;
var cookieName = 'tokenRest';


//send token to redis for blacklist
var redis = require('../databases/redis.js').redis;
module.exports.blacklist = function *(token){
	redis.set(token, Date(), 'NX', 'EX', ttd);
}


//returns signed token
module.exports.sign = function *sign( uname ){
	var payload = { user: uname };
	var options = { expiresIn:ttd, subject:'344 restAPI Project', issuer:domain };

	return jwt.sign( payload, tokenKey, options );
}


// returns now + ttd (mill seconds)
function dietime(){
	return new Date().getTime()+(ttd*1000);
}
//options for cookie
function cookieOpts() {
	return {expires:new Date(dietime()), secureProxy:true, overwrite:true, domain:domain};
}
module.exports.cookieOpts=cookieOpts;
module.exports.cookieName=cookieName;




//check token to make sure user is authenticated
module.exports.judge = function *tokenJudge(next){
	var token = this.cookies.get(cookieName,{domain:domain});
	
	//check for token or if token is in blacklist
	var blacklisted = yield redis.exists(token);
	if(token === undefined || !token || blacklisted) {
		this.redirect('/');
		return;
	}

	//check token is 'valid'-ish
	try {
		var decoded = yield jwt.verify(token, tokenKey, { issuer:domain });
	}catch(err) {
		console.log(err);
		this.redirect('/');
	}
	//if good, then set token and call next
	this.token = decoded;
	yield next;
}
