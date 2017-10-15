
function validUName(uname) {
	var reg = /^[a-zA-Z0-9-_~!@^&*+]{3,24}$/;
	return reg.test(uname);
}
function validPswd(pswd) {
	var reg = /^[a-zA-Z0-9-_`~!@#$%^&*+]{5,36}$/;
	return reg.test(pswd);
}
function validEmail(email) {
	var reg = /\S+@\S+\.\S+/;
	return reg.test(email);
}



module.exports.signup = function( newUser ){
	//lowercase the username, es also ID
	newUser.displayName = newUser.username;
	newUser.username = newUser.username.toLowerCase();

	// only the proper fields exist
	if( !newUser.username || !newUser.password || !newUser.email || Object.keys(newUser).length>5 ){
		return {msg:'bad request'}
	}
	// invalid username
	else if( !validUName(newUser.username) ){
		return {msg:'Invalid Username Entry'}
	}
	// invalid password
	else if( !validPswd(newUser.password) ){
		return {msg:'Invalid Password Entry'}
	}
	// invalid email
	else if( !validEmail(newUser.email) ){
		return {msg:'Invalid Email Entry'}
	}
	return {valid:true}
};




module.exports.login = function( reqBody ){
	reqBody.username = reqBody.username.toLowerCase();
	// only the proper fields exist
	if( !reqBody || !reqBody.username || !reqBody.password || Object.keys(reqBody).length>2 ){
		return {msg:'bad request'}
	}
	// invalid username
	else if( !validUName(reqBody.username) ){
		return {msg:'Invalid Username Entry'}
	}
	// invalid password
	else if( !validPswd(reqBody.password) ){
		return {msg:'Invalid Password Entry'}
	}
	return {valid:true}
};




