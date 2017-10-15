document.addEventListener('DOMContentLoaded', function(){


var heading = document.getElementById('description');
var meat = document.getElementById('meat');



var viewOptions = document.getElementById('viewOptions');
var profileView = document.getElementById('profileView');
var accountsView = document.getElementById('accountsView');
var transactionsView = document.getElementById('transactionsView');
var views = [null];

var profileB = document.getElementById('profileB');
profileB.addEventListener("click", pageSwitch);
views.push(profileB);

var accountsB = document.getElementById('accountsB');
accountsB.addEventListener("click", pageSwitch);
views.push(accountsB);

var transactionsB = document.getElementById('transactionsB');
transactionsB.addEventListener("click", pageSwitch);
views.push(transactionsB);

function pageSwitch(){
	viewOptions.style.display = "none";
	views[0] = this.id.slice(0,-1);
	if(~views[0].indexOf('profile')){
		heading.children[0].innerHTML = 'Your Profile';
	}
	else if(~views[0].indexOf('accounts')){
		heading.children[0].innerHTML = 'Your Accounts';
	}
	else if(~views[0].indexOf('transactions')){
		heading.children[0].innerHTML = 'Your Transactions History';
	}
	document.getElementById(views[0]+"View").style.display="flex";
	backB.disabled = false;
}


var messageArea = document.getElementById('messageArea');

var backB = document.getElementById('backB');
backB.addEventListener("click", function(e) {
	heading.children[0].innerHTML = 'Choose a Category to Expand';
	document.getElementById(views[0]+"View").style.display="none";
	viewOptions.style.display="flex";
	backB.disabled = true;
});

var logoutB = document.getElementById('logoutB');
logoutB.addEventListener("click", function(e) {
	window.location.href = '/logout';
});






var usrInfo, accountDomElements={}, transactionsRange;







var interWrapper = document.getElementById('interWrapper');

var interOptions = document.getElementById('interOptions');
var acctAddB = document.getElementById('acctAddB');
var	acctDelB = document.getElementById('acctDelB');
var transInB = document.getElementById('transInB');
var	transExB = document.getElementById('transExB');

var acctAdd = document.getElementById('acctAdd');
var acctDel = document.getElementById('acctDel');
var transIn = document.getElementById('transIn');
var transEx = document.getElementById('transEx');

var formControls = document.getElementById('formControls');
var submitB = document.getElementById('submitB');
var	cancelB = document.getElementById('cancelB');




var activePanel = null;


//all "Enter" keypress on any input box triggers submit button
var allInputBoxes = document.querySelectorAll("#interWrapper input");
for (var i = allInputBoxes.length - 1; i >= 0; i--) {
	allInputBoxes[i].addEventListener("keypress", function(e){
		var key = e.which || e.keyCode;
		if (key === 13 && !submitB.disabled)
			submitB.click();
	});
	allInputBoxes[i].addEventListener("input", function(e){
		if( !activePanel ){
			submitB.disabled = true;
			return;
		}
		messageArea.innerHTML = '';
	});
}



var executeButts = [acctAddB,acctDelB,transInB,transExB];
for (var butt of executeButts) {
	butt.addEventListener("click", formSwitch);
}
function formSwitch(){
	interOptions.style.display = 'none';
	formControls.style.display = 'flex';


	var target = this.id.slice(0,-1);
	activePanel = document.getElementById(target);
	activePanel.style.display = 'flex';

	var inputs = document.querySelectorAll("#"+target+" input");
	cancelB.addEventListener("click", restFormControls.bind(null, inputs), false);
	submitB.addEventListener("click", submissionSwitcher.bind(null, target, inputs), false);

}

function restFormControls(zeInputs){
	activePanel.style.display = 'none';
	activePanel = null;
	formControls.style.display = 'none';
	interOptions.style.display = 'flex';
	//reset listeners
	var clone = formControls.cloneNode(true);
	formControls.parentNode.replaceChild(clone, formControls);
	formControls = document.getElementById('formControls');
	cancelB = document.getElementById('cancelB');
	submitB = document.getElementById('submitB');

	//clear fields
	for (var i = zeInputs.length - 1; i >= 0; i--) {
		zeInputs[i].value = "";
	}

}

function submissionSwitcher(target, zeInputs){

	var fields = {};
	for (var i = zeInputs.length - 1; i >= 0; i--) {
		fields[zeInputs[i].name] = zeInputs[i].value;
	}

	var whichFunc;
	switch(target) {
		case "acctAdd":
			whichFunc = accountAdd;
			break;
		case "acctDel":
			whichFunc = accountDel;
			break;
		case "transIn":
			whichFunc = transactionInternal;
			break;
		case "transEx":
			whichFunc = transactionExternal;
			break;
	}
	whichFunc(fields);
}



function accountAdd(i){
	messageArea.style.color = 'red';
	if( !validAcctName(i.title) ){
		messageArea.innerHTML = 'Please enter an valid account name';
		return;
	}

	var xhr = new XMLHttpRequest();
	xhr.open("POST", '/api/user/'+usrInfo.username+'/account');
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onload = function(e) {
		if( xhr.status>300 || xhr.status<199 ){
			messageArea.style.color = 'red';
			messageArea.innerHTML = xhr.response;
			return;
		}
		messageArea.style.color = 'green';
		var res = JSON.parse(xhr.response);
		makeAccountBlock(res);
		cancelB.click();
		messageArea.innerHTML = 'Success: new account created!';
	};
	xhr.send(JSON.stringify(i));
}
function accountDel(i){
	messageArea.style.color = 'red';
	if( !accountDomElements[i.acctID] ){
		messageArea.innerHTML = 'Please enter an valid account ID';
		return;
	}
	if( accountDomElements[i.acctID].type == "default" ){
		messageArea.innerHTML = 'You cannot delete the default account,<br> only a secondary';
		return;
	}

	var xhr = new XMLHttpRequest();
	xhr.open("DELETE", '/api/user/'+usrInfo.username+'/account/'+i.acctID);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onload = function(e) {
		if( xhr.status>300 || xhr.status<199 ){
			messageArea.innerHTML = xhr.response;
			return;
		}
		messageArea.style.color = 'green';
		cancelB.click();
		if( accountDomElements[xhr.response] ){
			accountsView.removeChild(accountDomElements[xhr.response].elem);
			delete accountDomElements[xhr.response];
		}
		messageArea.innerHTML = 'Success: account '+i.acctID+' was deleted!';
	};
	xhr.send();
}
function transactionInternal(i){
	messageArea.style.color = 'red';
	if( !i.sourceID || !i.amount || !i.targetID ){
		messageArea.innerHTML = 'All three fields are required';
		return;
	}
	if( !accountDomElements[i.sourceID] ){
		messageArea.innerHTML = 'Please enter a valid account ID<br>to draw funds from';
		return;
	}
	if( !accountDomElements[i.targetID] ){
		messageArea.innerHTML = 'Please enter a valid account ID<br>to send funds to';
		return;
	}
	if( i.sourceID == i.targetID){
		messageArea.innerHTML = 'Cannot transfer to same account';
		return;
	}
	if( !validNumber(i.amount) ){
		messageArea.innerHTML = 'Please enter a numeric amount';
		return;
	}
	if( i.amount <= 0 ){
		messageArea.innerHTML = 'Please enter a positive amount';
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.open("POST", '/api/user/'+usrInfo.username+'/account/'+i.sourceID+"/transactIn/"+i.targetID);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onload = function(e) {
		if( xhr.status>300 || xhr.status<199 ){
			messageArea.innerHTML = xhr.response;
			return;
		}
		messageArea.style.color = 'green';
		var res = JSON.parse(xhr.response);
		cancelB.click();
		//refresh page
		accountsView.removeChild(accountDomElements[i.sourceID].elem);
		delete accountDomElements[i.sourceID];
		accountsView.removeChild(accountDomElements[i.targetID].elem);
		delete accountDomElements[i.targetID];

		makeAccountBlock(res.src);
		makeAccountBlock(res.tgt);

		messageArea.innerHTML = 'Success: '+i.amount+' was transfered to account: <b>'+i.targetID+'</b>!';
	};
	xhr.send(JSON.stringify({amount:parseInt(i.amount)}));
}
function transactionExternal(i){
	messageArea.style.color = 'red';
	if( !i.sourceID || !i.amount || !i.targetUser ){
		messageArea.innerHTML = 'All three fields are required';
		return;
	}
	if( !accountDomElements[i.sourceID] ){
		messageArea.innerHTML = 'Please enter a valid account ID<br>to draw funds from';
		return;
	}
	if( !validUName(i.targetUser) ){
		messageArea.innerHTML = 'Please enter a user to gift funds to';
		return;
	}
	if( !validNumber(i.amount) ){
		messageArea.innerHTML = 'Please enter a numeric amount';
		return;
	}
	if( i.amount <= 0 ){
		messageArea.innerHTML = 'Please enter a positive amount';
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.open("POST", '/api/user/'+usrInfo.username+'/account/'+i.sourceID+"/transactEX/"+i.targetUser);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onload = function(e) {
		if( xhr.status>300 || xhr.status<199 ){
			messageArea.innerHTML = xhr.response;
			return;
		}
		messageArea.style.color = 'green';
		var res = JSON.parse(xhr.response);
		cancelB.click();

		accountsView.removeChild(accountDomElements[i.sourceID].elem);
		delete accountDomElements[i.sourceID];
		makeAccountBlock(res);

		messageArea.innerHTML = 'Success: '+i.amount+' was transfered to user: <b>'+i.targetUser+'</b>!';
	};
	xhr.send(JSON.stringify({amount:parseInt(i.amount)}));
}







function getProfile(){

	var xhr = new XMLHttpRequest();
	xhr.open('get', '/api/user');
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onload = function(e) {
		if( xhr.status>300 || xhr.status<199 ){
			messageArea.innerHTML = 'Whoooops';
			return;
		}

		usrInfo = JSON.parse(xhr.response);
		getAllAccounts();

	};
	xhr.send();
}



function getAllAccounts(){
	var xhr = new XMLHttpRequest();
	xhr.open('get', '/api/user/'+usrInfo.username+'/accounts');
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onload = function(e) {
		if( xhr.status>300 || xhr.status<199 ){
			messageArea.innerHTML = 'Server Error';
			return;
		}
		var acctsData = JSON.parse(xhr.response);
		for( var obj of acctsData ){
			makeAccountBlock(obj);
		}
	};
	xhr.send();
}
var acctDefault = document.getElementById('acctDefault');
var acctSeconds = document.getElementById('acctSeconds');
function makeAccountBlock(acct){
	var display = {
		id:acct.id,
		name:acct.name,
		bal:acct.currentBal,
	}

	var wrap = document.createElement("div");
	wrap.className = "accountBlock";
	for( var x in display ){
		var inner = document.createElement("div");
		var node = document.createTextNode(display[x]);
		inner.appendChild(node);
		wrap.appendChild(inner);
	}

	accountDomElements[acct.id] = {elem:wrap,type:acct.type};
	if( ~("default".indexOf(acct.type)) ){
		accountsView.insertBefore( wrap, acctSeconds );
		return;
	}
	accountsView.insertBefore( wrap, interWrapper );

}







function getTransactions(){

	var xhr = new XMLHttpRequest();

}









function validUName(uname) {
	var reg = /^[a-zA-Z0-9-_~!@^&*+]{3,24}$/;
	return reg.test(uname);
}
function validNumber(title) {
	var reg = /^[0-9,.+]{1,50}$/;
	return reg.test(title);
}
function validAcctName(title) {
	var reg = /^[a-zA-Z0-9-_~!@&+]{1,50}$/;
	return reg.test(title);
}


getProfile();
});
//on ready wrapper
