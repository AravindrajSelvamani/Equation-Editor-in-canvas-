function wrs_urlencode(clearString) {
	var output = '';
	var x = 0;
	clearString = clearString.toString();
	var regex = /(^[a-zA-Z0-9_.]*)/;
	
	var clearString_length = ((typeof clearString.length) == 'function') ? clearString.length() : clearString.length;

	while (x < clearString_length) {
		var match = regex.exec(clearString.substr(x));
		if (match != null && match.length > 1 && match[1] != '') {
			output += match[1];
			x += match[1].length;
		}
		else {
			var charCode = clearString.charCodeAt(x);
			var hexVal = charCode.toString(16);
			output += '%' + ( hexVal.length < 2 ? '0' : '' ) + hexVal.toUpperCase();
			++x;
		}
	}
	
	return output;
}

function wrs_mathmlEntities(mathml) {
	var toReturn = '';
	
	for (var i = 0; i < mathml.length; ++i) {
		//parsing > 128 characters
		if (mathml.charCodeAt(i) > 128) {
			toReturn += '&#' + mathml.charCodeAt(i) + ';';
		}
		else {
			toReturn += mathml.charAt(i);
		}
	}

	return toReturn;
}

function getsvgfromWiris(mathml){
	return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest();
	req.open("POST","http://www.wiris.net/demo/editor/render.svg", false);
    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    var params = "mml="+wrs_urlencode(wrs_mathmlEntities(mathml))
    
	req.onreadystatechange = function () {
		if (req.readyState == 4) {
			if (req.status != 200)  {
				resolve({"status":false,"mss":"failed in conversion" } )
			}
			else {
				resolve({"status":true,"data":req.responseText } )
			}
		}
	}

	req.send(params);
});
}