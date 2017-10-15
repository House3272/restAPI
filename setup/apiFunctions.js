var re = require('./databases/rethink').rethink;

var bb = require('bluebird');
var bcrypt = require('bcrypt-then');


//const uniqueLastNumbers = -3;
//const maxFundsPerAcct = 999999;
const maxAcctsPerUser = 4;
const newUserFunds = 100;
const returnLimit = 20;

// Users
const tUsers = 'usersLocal';
// Active accounts
const tAccounts = 'accountsActive';
// Retired Accounts
const tRetired = 'accountsRetired';
// Generations
const tGenerations = 'generations';
// Internal Transactions
const tTransIn = 'transInC';
// External Transactions
const tTransEx = 'transExC';





var fetchDoc = bb.coroutine(function*( table, id ){
	try {
		var result = yield re.table(table).get(id);
	} catch(err) {
		console.log(err);
	}
	return result;
});
var insertDoc = bb.coroutine(function*( table, params ){
	try {
		var result = yield re.table(table).insert(params);
	} catch(err) {
		console.log(err);
	}
	return result;
});
var updateDoc = bb.coroutine(function*( table, id, newData, options ){
	try {
		var result = yield re.table(table).get(id).update(newData,options);
	} catch(err) {
		console.log(err);
	}
	return result;
});
var removeDoc = bb.coroutine(function*( table, id ){
	try {
		yield re.table(table).get(id).delete();
	} catch(err) {
		console.log(err);
	}
	return;
});











//create new user, default account, and add initial funds
var newUser = bb.coroutine(function*( params ){
	//check params
	if( !params )
		return {msg:'bad fields'}
	// check username avalible
	if( yield fetchDoc(tUsers,params.username) )
		return {msg:'Username Unavalible'}

	// request time stamp & hash password
	params.created = new Date();
	params.password = yield bcrypt.hash(params.password, 13);

	//save new user + flag account param
	params.accounts = 'pending';
	yield insertDoc(tUsers,params);

	//create default account
	var newDefaultAccount = {
		owner:params.username,
		created:params.created,
		currentBal:0,
		name:'Default Account',
		type:'default',
		generations:[],
		transactions:{internal:[],external:[]}
	}
	var newAccountID = (yield insertDoc(tAccounts, newDefaultAccount)).generated_keys[0];

	//save account to user
	yield updateDoc(tUsers,params.username,{accounts:{default:newAccountID,secondary:[]}} );

	//generate initial funds
	var initialFunds = {
		timestamp: params.created,
		amount: newUserFunds,
		targetAccount: newAccountID,
		authorization: 'system',
		reason: 'new account',
		newBal: 'pending'
	}
	var generationID = (yield insertDoc(tGenerations, initialFunds)).generated_keys[0];

	//append initial funds to default account
	var appendFunds = {
		currentBal: newUserFunds,
		generations: re.row("generations").append(generationID)
	}
	var newBal = (yield updateDoc(tAccounts,newAccountID,appendFunds,{returnChanges:true})).changes[0].new_val.currentBal;

	//complete generation record
	yield updateDoc(tGenerations, generationID, {newBal: newBal});
	return {win:true}
});
module.exports.newUser = newUser;



var getUser = function( uname ){
	return fetchDoc(tUsers,uname)
}
module.exports.getUser = getUser;

//returns user full profile or null
var getUserP = bb.coroutine(function*( uname ){
	var full = yield fetchDoc(tUsers,uname);

	for (i = 0; i < full.accounts.secondary.length; ++i) {
		full.accounts.secondary[i] = full.accounts.secondary[i].slice(-3);
	}
	var response = {
		username:full.username,
		displayName:full.displayName,
		email:full.email,
		accounts:{
			default:full.accounts.default.slice(-3),
			secondary:full.accounts.secondary
		}
	}
	return response;
});
module.exports.getUserP = getUserP;
// edit user profile
// var editUser = bb.coroutine(function*( uname, params ){
// });
// module.exports.editUser = editUser;









// returns formatted account
var getOneAccount = bb.coroutine(function*( ID ){
	var acct = yield fetchDoc(tAccounts,ID);
	var formatted = {
		id:acct.id.slice(-3),
		currentBal:acct.currentBal,
		type:acct.type,
		name:acct.name,
		transactions:acct.transactions,
		//owner:acct.owner,
		//created: acct.created
	}
	return formatted;
});
module.exports.getOneAccount = getOneAccount;
// returns accounts
var getAllAccounts = bb.coroutine(function*( usr ){
	//check params
	if( !usr ){
		return {status:400}
	}
	//get accounts
	var accts = [usr.accounts.default].concat(usr.accounts.secondary);
	for( var i=accts.length-1; i>=0; i-- ){
		accts[i] = yield getOneAccount(accts[i],usr);
	}
	return {victory:accts};
});
module.exports.getAllAccounts = getAllAccounts;


// edits account
var editAccount = bb.coroutine(function*( uname, ID ){
});
module.exports.editAccount = editAccount;


// new secondary account
var newAccount = bb.coroutine(function*( uname, title ){
	//check params
	if( !uname || !title )
		return {msg:'bad fields'}
	// check user exists
	var usr = yield fetchDoc(tUsers,uname);
	if( !usr || !usr.accounts ){
		return {msg:'data error'}
	}

	//check # of pre-existing secondary accounts
	var secondaries = usr.accounts.secondary;
	if( !secondaries || secondaries.length<0 || secondaries.length>maxAcctsPerUser ){
	// database error: secondary account field
		return {msg:'data error'}
	}
	else if( secondaries.length==maxAcctsPerUser ){
	// user has max allowed secondary accounts
		return {msg:'maximum number of allowed accounts reached'}
	}
	//create account
	var newSecondaryAccount = {
		currentBal:0,
		owner:uname,
		name:title,
		type:'secondary',
		created:new Date(),
		transactions:{internal:[],external:[]},
		generations:[]
	}
	//make sure last 3 number is unique to other secondaries
	//maxium of 8 tries, because chances are very low that it'll match even once (1 in 1000)
	for (var match=0; match<9; match++) {
		var offered = (yield insertDoc(tAccounts,newSecondaryAccount)).generated_keys[0];
		for( id of secondaries ){
			var newID = offered.slice(-3);
			var extantID = id.slice(-3);
			if( ~extantID.indexOf(newID) ){
				match = ~match;
				break;
			}
		}
		//there was a match
		if( match < 0 ){
			yield removeDoc(tAccounts,offered);
			//exhausted allowed iterations
			if( ~match >= 9 ){
				return {msg:'the improbable happened...try again please'};
			}
			match = ~match;
			continue;
		//good to go, non matched
		}else{
			newSecondaryAccount = offered;
			break;
		}
	}

	//save account to user
	var appendAccount = { accounts: {secondary: re.row("accounts")("secondary").append(newSecondaryAccount)} };
	yield updateDoc( tUsers,uname,appendAccount,{returnChanges:true} );
	return yield getOneAccount(newSecondaryAccount);
});
module.exports.newAccount = newAccount;



// remove account, only if funds are at 0
var removeAccount = bb.coroutine(function*( uname, lastThree ){
	//check params
	if (!uname || !lastThree) {
		return {msg:'bad fields'}
	}
	// user exists
	var usr = yield fetchDoc(tUsers,uname);
	if( !usr || !usr.accounts ){
		return {msg:'data error'}
	}
	// exists secondary account(s)
	var secondaries = usr.accounts.secondary;
	if(!secondaries || secondaries.length<1 || secondaries.length>maxAcctsPerUser){
	// database error: secondary account field
		return {msg:'data error'}
	}

	// find matching account
	var idx;
	for( var i=0; i<secondaries.length; i++ ){
		var extantID = secondaries[i].slice(-3);
		if( ~extantID.indexOf(lastThree) ){
			idx = i;
			break;
		}
	}
	if( !idx ){
	// account not linked with user
		return {msg:'requested account not found'}
	}
	var target = yield fetchDoc(tAccounts,secondaries[idx]);
	if( !target ){
	// account not found
		return {msg:'requested account not found'}
	}
	else if( target.currentBal != 0 ){
	//still have funds or somehow in the hole
		return {msg:'account still has funds'}
	}

	// remove account from user
	var removeLink = { accounts: {secondary: re.row("accounts")("secondary").deleteAt(idx)} };
	yield updateDoc( tUsers,uname,removeLink,{returnChanges:true} );

	// move account from active to retired table
	var moveTarget = { retired:new Date(), account:target };
	yield insertDoc( tRetired,moveTarget,{returnChanges:true} );

	yield removeDoc( tAccounts, target.id );

	return target.id.slice(-3);
});
module.exports.removeAccount = removeAccount;
//removeAccount('house0', '34a');











var getTransferRecords = bb.coroutine(function*( sourceUser, acctID, range ){

});
module.exports.getTransferRecords = getTransferRecords;




// transfer between a user's own accounts
var internalTransfer = bb.coroutine(function*( sourceUser, amount, sourceTre, targetTre ){
	//check params
	if(!sourceUser || !amount || !sourceTre || !targetTre){
		return {msg:'bad fields'};
	}
	// check user exists
	var usr = yield fetchDoc(tUsers,sourceUser);
	if( !usr || !usr.accounts ){
		return {msg:'data error'};
	}
	// at least 2 accounts
	var accts = usr.accounts;
	if( !accts.default || !accts.secondary || accts.secondary.length<1 ){
		return {msg:'your account(s) not found'};
	}
	accts = accts.secondary.slice();
	accts.push(usr.accounts.default);

	// find full id of accounts
	var sourceID,targetID;
	for( var i=0; i<accts.length; i++ ){
		var extantID = accts[i].slice(-3);
		if( ~extantID.indexOf(sourceTre) ){
			sourceID = accts[i];
			continue;
		}else if( ~extantID.indexOf(targetTre) ){
			targetID = accts[i];
		}
	}
	if( !sourceID || !targetID ){
	// account not in user data
		return {msg:'requested accounts not found'}
	}

	// get the two account records
	var srcAcct = yield fetchDoc(tAccounts,sourceID);
	var tgtAcct = yield fetchDoc(tAccounts,targetID);
	if( !srcAcct || !tgtAcct ){
	// account not found
		return {msg:'requested account not found'}
	}
	else if( srcAcct.currentBal < amount ){
	// source account insufficient funds for transfer
		return {msg:'source account does not have enough funds for this transfer'}
	}

	// internal transaction fields check
	if( !srcAcct.transactions || !srcAcct.transactions.internal ||
		!(srcAcct.transactions.internal instanceof Array) ||
		!tgtAcct.transactions || !tgtAcct.transactions.internal ||
		!(tgtAcct.transactions.internal instanceof Array) ){
		return {msg:'data corruption'}
	}


	//credit source, debit target
	srcAcct = (yield updateDoc( tAccounts, sourceID, {
		currentBal: re.row("currentBal").add(-amount)
	} ,{returnChanges:true})).changes[0];
	tgtAcct = (yield updateDoc( tAccounts, targetID, {
		currentBal: re.row("currentBal").add(+amount)
	} ,{returnChanges:true})).changes[0];

	//log transaction
	var transaction = (yield insertDoc( tTransIn, {
		timestamp: new Date(),
		amount: amount,
		sourceAccount: {id:sourceID, pre:srcAcct.old_val.currentBal, post:srcAcct.new_val.currentBal},
		targetAcount: {id:targetID, pre:tgtAcct.old_val.currentBal, post:tgtAcct.new_val.currentBal},
		accountsOwner: usr.username,
		//reason: user string,
		//authorization: who executed request
	})).generated_keys[0];

	// append transaction record to the 2 accounts
	var result = (yield re.table(tAccounts).getAll(sourceID,targetID).update({
		transactions: {internal:re.row("transactions")("internal").append(transaction)}
	} ,{returnChanges:true}));

	return {src:(yield getOneAccount(sourceID)),tgt:yield getOneAccount(targetID)}
});
module.exports.internalTransfer = internalTransfer;





// transfer between the requester's specified account, and a target user's default account
var externalTransfer = bb.coroutine(function*( sourceUser, sourceTre, amount, targetUser ){
	//check params
	if(!sourceUser || !sourceTre || !amount || !targetUser){
		return {msg:'bad fields'};
	}
	// check sourceUser and targetUser exists
	var srcUsr = yield fetchDoc(tUsers,sourceUser);
	var tgtUsr = yield fetchDoc(tUsers,targetUser);
	if( !srcUsr || !srcUsr.accounts || !tgtUsr || !tgtUsr.accounts){
		return {msg:'data error'};
	}

	// find full id of source account
	var sourceID;
	var sAcct = srcUsr.accounts.secondary.slice();
	sAcct.push(srcUsr.accounts.default);
	for( var i=0; i<sAcct.length; i++ ){
		var extantID = sAcct[i].slice(-3);
		if( ~extantID.indexOf(sourceTre) ){
			sourceID = sAcct[i];
			break;
		}
	}
	var targetID = tgtUsr.accounts.default;
	if( !sourceID || !targetID ){
	// account records not found or matches
		return {msg:'requested accounts not found'}
	}
	// get the two account records
	var srcAcct = yield fetchDoc(tAccounts, sourceID);
	var tgtAcct = yield fetchDoc(tAccounts, targetID);
	if( !srcAcct || !tgtAcct ){
	// account not found
		return {msg:'requested account not found'}
	}
	else if( srcAcct.currentBal < amount ){
	// source account insufficient funds for transfer
		return {msg:'this account does not have enough funds for this transfer'}
	}

	// external transaction fields check
	if( !srcAcct.transactions || !srcAcct.transactions.external ||
		!(srcAcct.transactions.external instanceof Array) ||
		!tgtAcct.transactions || !tgtAcct.transactions.external ||
		!(tgtAcct.transactions.external instanceof Array) ){
		return {msg:'data corruption'}
	}

	//credit source, debit target
	srcAcct = (yield updateDoc( tAccounts, sourceID, {
		currentBal: re.row("currentBal").add(-amount)
	} ,{returnChanges:true})).changes[0];
	tgtAcct = (yield updateDoc( tAccounts, targetID, {
		currentBal: re.row("currentBal").add(+amount)
	} ,{returnChanges:true})).changes[0];

	//log transaction
	var transaction = (yield insertDoc( tTransEx, {
		timestamp: new Date(),
		amount: amount,
		sourceAccount: {id:sourceID, owner:srcUsr.username, pre:srcAcct.old_val.currentBal, post:srcAcct.new_val.currentBal},
		targetAcount: {id:targetID, owner:tgtUsr.username, pre:tgtAcct.old_val.currentBal, post:tgtAcct.new_val.currentBal},
		//reason: user string,
		//authorization: who executed request
	})).generated_keys[0];

	// append transaction record to the 2 accounts
	var result = (yield re.table(tAccounts).getAll(sourceID,targetID).update({
		transactions: {external:re.row("transactions")("external").append(transaction)}
	} ,{returnChanges:true}));

	return yield getOneAccount(sourceID)
});
module.exports.externalTransfer = externalTransfer;








///Todo: handle undefined parameters/variables


/*structure



Users
r.db('rest').tableCreate('usersLocal', {primaryKey: 'username', durability: 'hard'})
-Username (lowercased) ID field
-DisplayName (Username but Case-Sensitive)
-Email(not unique with Username guess)
-pswd
-Phone Number?
accounts: {default:id,secondary:[id,id,id]}
-SignUp Date
-Admin: T/F (optional?)




Accounts
r.db('rest').tableCreate('accountsActive', {durability: 'hard'})
-Self-generated ID-
created: Creation Date
owner: UserName/ID of Owner
currentBal: Current Balance
name: Default Account/string
type: default/secondary
generations: [GenerationID]
transactions: {internal:ID,external:ID}




Internal Transactions
r.db('rest').tableCreate('transInC', {durability: 'hard'})
-Self-generated ID,
timestamp: Time Stamp
amount: Amount Transfered
sourceAccount: {id:id, pre:#, post:#}
targetAcount: {id:id, pre:#, post:#}
accountsOwner: username
reason: user string
authorization: who executed request



External Transactions
r.db('rest').tableCreate('transExC', {durability: 'hard'})
-Self-generated ID
timestamp: Time Stamp
amount: Amount Transfered
sourceAccount: {id:id, pre:#, post:#, owner:username}
targetAcount: {id:id, pre:#, post:#, owner:username}
reason: user string
authorization: who executed request



Past Transactions?






Retired Accounts
r.db('rest').tableCreate('accountsRetired', {durability: 'hard'})
-Self-generated ID-
retired: date
account: Accounts attributes



Generations
r.db('rest').tableCreate('generations', {durability: 'hard'})
-Self generated ID-
timestamp: Time Stamp
amount: Amount Generated (Given)
targetAccount: Recieving Account
authorization: System/Admin Username
reason: new account / admin string
newBal: New Balance of Recieving Account


*/












// Admin Only----------------------------------------------------------------------------
var generate = bb.coroutine(function*( amount ){

	var newRecord = {};
	newRecord.timestamp = new Date();

	var targetAccount = r.table('accountsActive').get(target);

	// account exists
	if( true ){

	}
	if(amount < 0){

	}
    //console.log(amount);
});

//generate(999);






function generation(amount) {
	// r.table('usersLocal').insert( info, {returnChanges: true} ).then(function(result){
	// 	console.log(result.changes[0].new_val);
	// });
}


