document.addEventListener('DOMContentLoaded', function(){


var heading = document.getElementById('directions');
var loginOptions = document.getElementById('loginOptions');
var localExistForm = document.getElementById('localExistForm');
var localNewForm = document.getElementById('localNewForm');
var messageArea = document.getElementById('messageArea');
var formControl = document.getElementById('formControl');
var submitB = document.getElementById('enter');


// log in
document.getElementById('localExist').addEventListener("click", function(e) {
	e.preventDefault();
	validateInput(localExistsInputs);
	submitB.innerHTML = 'Sign In';
	heading.children[0].innerHTML = 'Submit Credentials to Proceed';
	loginOptions.style.display = "none";
	formControl.hidden = false;
	localExistForm.style.display = "flex";
	submitB.value = 'exist';
});
// sign up
document.getElementById('localNew').addEventListener("click", function(e) {
	e.preventDefault();
	validateInput(localNewInputs);
	submitB.innerHTML = 'Create Account';
	heading.children[0].innerHTML = 'Fill and Submit Form to Proceed';
	loginOptions.style.display = "none";
	formControl.hidden = false;
	localNewForm.style.display = "flex";
	submitB.value = 'new';
});

// cancel either
var cancelB = document.getElementById('cancel');
cancelB.addEventListener("click", function(e){
	e.preventDefault();
	// clear inputs?
	localExistForm.style.display = "none";
	localNewForm.style.display = "none";
	messageArea.hidden = true;
	formControl.hidden = true;
	heading.children[0].innerHTML = 'Authenticate to Continue';
	loginOptions.style.display = "flex";
	submitB.value = '';
});







//inputs collection
var localExistsInputs = document.querySelectorAll('#localExistForm input');
var localNewInputs = document.querySelectorAll('#localNewForm input');

// attach listeners to each input field
addListeners(localExistsInputs);
addListeners(localNewInputs);

function addListeners(inputSet){
	for(var i = 0; i<inputSet.length; i++){
		// enter = submit if fields are valid
		inputSet[i].addEventListener("keypress", function (e) {
			var key = e.which || e.keyCode;
			if (key === 13 && !submitB.disabled)
				submitB.click();
		});
		// recheck fields on each input
		inputSet[i].addEventListener("input", validateInput.bind(null, inputSet) );
	}
}

function validateInput(inputSet){
	var isValid = true;
	for(var i = 0; i<inputSet.length; i++){
		var inputVal = inputSet[i].value.replace(/&nbsp;/g,'').trim();

		switch ( inputSet[i].name.toLowerCase() ){
			case "email":
				if( !validEmail(inputVal) )
					isValid=false;
				break;
			case "username":
				if( !validUName(inputVal) )
					isValid=false;
			case "password":
				if( !validPswd(inputVal) )
					isValid=false;
				break;
			case "password0":
				if( inputVal !== inputSet[2].value ) //2 = position of 1st password field
					isValid=false;
				break;
			case "color":
			default:
				break;
		}

	}
	submitB.disabled = !isValid;
}
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



//submit local authentication info
submitB.addEventListener("click", function(e) {
	e.preventDefault();

	var connection;
	var payload = {};
	
	if( submitB.value.toLowerCase()=='exist' ){
		connection = "/login";
		for( var i = 0; i<localExistsInputs.length; i++ ){
			payload[localExistsInputs[i].name] = localExistsInputs[i].value;
		}
	}else if( submitB.value.toLowerCase()=='new' ){
		connection = "/signup";
		for( var i = 0; i<localNewInputs.length; i++ ){
			if( localNewInputs[i].value && localNewInputs[i].name != 'password0' )
				payload[localNewInputs[i].name] = localNewInputs[i].value;
		}
	}else{
		cancelB.click();
		return;
	}


	var xhr = new XMLHttpRequest();
	xhr.open("POST", connection);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.onload = function(e) {
		messageArea.style.color = "#2b2";
		messageArea.innerHTML = xhr.statusText;
		if( xhr.status === 202 ){
			setTimeout( window.location.href = xhr.response ,9000);
		}else if( xhr.status === 201 ){
			setTimeout( function(){ window.location.href = xhr.response } ,1600);
		}else{
			messageArea.style.color = "#b22";
			messageArea.innerHTML = xhr.response;
		}
		messageArea.hidden=false;
	};
	xhr.send(JSON.stringify(payload));


});





});
//on ready wrapper