var koa = require('koa')();
var mount = require('koa-mount');
var static = require('koa-static');
var routa = require('koa-router');
var koaBody = require('koa-body')();

var bcrypt = require('bcrypt-then');

var tokens = require('./setup/authentication/tokens');
var validate = require('./setup/validation/validate');

var re = require('./setup/apiFunctions');



//routing blocks
//-----------------------------------------------------------------------------------------------------------------------

//if not valid json, node json parser will error, should make error message?
//concurrent requests not handled, such multiple newUsers with same username I think

var publicRoutes = new routa();
publicRoutes
// browser prefetching, use post/delete?
.get('/logout', function *(next){
	var token = this.cookies.get(tokens.cookieName);
	if( token ){
		//clear token cookie from client
		this.cookies.set(tokens.cookieName, false, {overwrite:true, domain:"rest.frosation.com"});
		//blacklist token
		yield tokens.blacklist(token);
	}
	return this.redirect('/');
})

.post('/signup', koaBody, function *(next){
	var reqBody = this.request.body;
	//validate inputs
	var request = validate.signup(reqBody);
	if( !request.valid ){
		this.body = request.msg;
		return this.status = 400
	}

	// create new user
	var attempt = yield re.newUser(reqBody);
	if( attempt.msg ){
		this.body = attempt.msg;
		return this.status = 400
	}

	//set token & cookie
	var tokena = yield tokens.sign(reqBody.username);
	this.cookies.set(tokens.cookieName, tokena, tokens.cookieOpts());
	//path for redirect
	this.body = '/private';
	
	return this.status = 201
})

.post('/login', koaBody, function *(next){
	var reqBody = this.request.body;
	//validate inputs
	var request = validate.login(reqBody);
	if( !request.valid ){
		this.body = request.msg;
		return this.status = 400
	}

	// user exist & password matches
	var assertUser = yield re.getUser(reqBody.username);
	if( !assertUser || !assertUser.password || 
		!(yield bcrypt.compare(reqBody.password, assertUser.password)) ){
		this.body = 'bad username/password combo';
		return this.status = 400
	}

	//set token & cookie
	var tokena = yield tokens.sign(reqBody.username);
	this.cookies.set(tokens.cookieName, tokena, tokens.cookieOpts());
	//path for redirect
	this.body = '/private';

	return this.status = 202
})

;



//-----------------------------------------------------------------------------------------------------------------------



var privateRoutes = new routa();

privateRoutes
.get('/logout', function *(next) {
	this.status = 301;
	this.redirect('/logout');
})
.get('/', function *(next) {
	this.body = "Hello, you've reached the private api collection for this site";
})



.get('/user', function *(next) {
	var whoami = yield re.getUserP(this.token.user);
	if( !whoami )
		return this.status = 500;
	this.body = whoami;
	return this.status = 200
})

.param('uname', function *(id, next) {
	var userToken = this.token.user;
	if( !userToken || !id ){
		return this.status = 400
	}
	if( userToken != id ){
		return this.status = 401
	}
	this.usrFull = yield re.getUser(userToken);
	yield next;
})
.get('/user/:uname', function *(next) {
})
.put('/user/:uname', koaBody, function *(next) {
	console.log("PUT this.request.body");
	//var profile = yield re.editUser(this.token.user,reqBody);
	return;
})



.get('/user/:uname/account*', function *(next) {
	var check = yield re.getAllAccounts(this.usrFull);
	if(!check.victory){
		return this.status = check.status
	}
	this.body = check.victory;
	return this.status = 200
})
.get('/user/:uname/account/:acctID', function *(next) {
	return;
	var check = re.getOneAccount(this.usrFull);
	if( check.msg ){
		this.body = check.msg;
		return this.status = 400
	}
	this.body = check;
	return this.status = 200
})
.post('/user/:uname/account', koaBody, function *(next) {
	var reqBody = this.request.body;

	if( !reqBody.title )
		reqBody.title='undefined'

	var result = yield re.newAccount(this.usrFull.username,reqBody.title);
	if( result.msg ){
		this.body = result.msg;
		return this.status = 400
	}
	this.body = result;
	return this.status = 201
})
.put('/user/:uname/account/:acctID', function *(next) {
})
.delete('/user/:uname/account/:acctID', function *(next) {
	console.log(this.usrFull.username);
	console.log(this.params.acctID);

	var result = yield re.removeAccount(this.usrFull.username, this.params.acctID);
	if( result.msg ){
		this.body = result.msg;
		return this.status = 400
	}
	this.body = result;
	return this.status = 200
})



.get('/user/:uname/account/:acctID/transactions/:tRange', function *(next) {
})
.post('/user/:uname/account/:acctID/transactIn/:targetAcct', koaBody, function *(next) {
	var amount = this.request.body.amount;
	var p = this.params;

	var result = yield re.internalTransfer(this.usrFull.username, amount, p.acctID, p.targetAcct);
	if( result.msg ){
		this.body = result.msg;
		return this.status = 400
	}
	this.body = result;
	return this.status = 200
})
.post('/user/:uname/account/:acctID/transactEX/:targetUsr', koaBody, function *(next) {
	var amount = this.request.body.amount;
	var p = this.params;
	var result = yield re.externalTransfer(this.usrFull.username, p.acctID, amount, p.targetUsr);
	if( result.msg ){
		this.body = result.msg;
		return this.status = 400
	}
	this.body = result;
	return this.status = 200
})

;
/*
*user
GET: 	/api/user/{userid}
-PUT: 	/api/user/{userid}

*account
GET: 	/api/user/-userID-/account/{-3ID | default}
-PUT: 	update account name/description
POST: 	create new account
DELETE: retire account

*transcation
-GET: 	/api/user/-userID-/account/-3ID | default-/transactions
POST: 	/api/user/-userID-/transact/{internal | external}
*/




//END routing blocks
//-----------------------------------------------------------------------------------------------------------------------


koa
.use( static('public',{maxage:56000}) )
.use( publicRoutes.routes() )

.use( tokens.judge )
.use( mount('/private', static('private',{maxage:9000}) ) )
.use( mount('/api', privateRoutes.routes()) )

//.use( 404 )
;

koa.listen(6789);


