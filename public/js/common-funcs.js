async function request({ url, data, method = 'GET', responseType = 'json', success, error, ...args }) {

	if (error == undefined) {
		error = function (result) {
			console.log(`Error: Ошибка связи с сервером ${result}`);
		};
	}

    if (debug) {
        if (success){
            success = catchResult(success);
        }
		error = catchResult(error);
    }

    method = method.toUpperCase();

    contentType = 'multipart/form-data';

	if (method === 'GET') {
        if (data){
            url += '?' + btoa(new URLSearchParams(data).toString());
            data = undefined;
        }
        contentType = 'application/x-www-form-urlencoded';
    }
    else if (typeof data === 'string' && data[0] === '{'){
        contentType = 'application/json';
    }

    let options = {
        method: method,
        body: data,
        headers: {
            'Content-Type': contentType,
        },
    }

    if (url[0] === '/') {
        url = url.substr(1);
    }
    if (!url.includes('://')){
        url = '/api/' + url;
		// url = 'https://nticore.com/DM/api/' + url;
    }

    try {
		const response = await fetch(url, options);

		if (response.ok) {
			let result;
			if (responseType === "base64") {
				result = await response.text();
				result = JSON.parse(atob(result.trim()));
			}
			else {
				result = await response[responseType]();
			}

            if (success){
                success(result);
            }
            return result;
		}
		error(response.status);
    } catch (throwed) {
        error(throwed);
	}
}

function catchResult(func) {
	return function (args) {
		console.log(args);
		return func.call(this, args);
	};
}

function camelize(str) {
	return str
		.split("-")
		.map((word, index) => (index == 0 ? word : word[0].toUpperCase() + word.slice(1)))
		.join("");
}

function clearBlock(block) {
	while (block.firstChild && block.removeChild(block.firstChild));
}

function createNewElement({ tag: tagName = "div", ...attributes }) {
	if (debug) {
		console.log(attributes);
	}
	let element = document.createElement(tagName);
	applyAttributes(element, attributes);
	return element;
}

function applyAttributes(element, attributes) {
	for (let [attName, attrValue] of Object.entries(attributes)) {
		if (typeof attrValue !== "object") {
			element[attName] = attrValue;
		}
		else {
			applyAttributes(element[attName], attrValue);
		}
	}
}

Array.prototype.shuffle = function () {
	let j;
	for (let i = this.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1)); // случайный индекс от 0 до i
		[this[i], this[j]] = [this[j], this[i]];
	}
	return this;
};

function resetInputOptions(element, result){
    clearBlock(element.list);
    result.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        element.list.appendChild(option);
    });
}

function addScriptFile(src,callback = '') {
	if (Array.isArray(src)){
		for (let index = 0; index < src.length; index++) {
			addScriptFile(src[index], callback)
		}
	}
	else{
		if (document.head.querySelector(`script[src="${src}"]`)){
			return false;
		}
		let script = document.createElement('script');
		script.src = src;
		script.async = true;
		document.head.appendChild(script);
		if (callback !== '')
			script.onload = callback;
		return true;
	}
}

function addCssFile(src) {
	if (Array.isArray(src)){
		for (let index = 0; index < src.length; index++) {
			addCssFile(src[index])
		}
	}
	else{
		if (document.head.querySelector(`link[href="${src}"]`)){
			return false;
		}
		let link  = document.createElement('link');
		link.rel  = 'stylesheet';
		link.type = 'text/css';
		link.href = src;
		link.media = 'all';
		document.head.appendChild(link);
	}
}

function objectToJson(data) {
    const object = {};
    data.forEach((value, key) => {
        value = value.replace("'", '’');
        if (key.includes('[')) {
			key = key.substr(0, key.indexOf('['));
			if (!object[key]){
				object[key] = [];
			}
			object[key][object[key].length] = value;
			return;
        }
        else {
            object[key] = value;
        }
    });
    return JSON.stringify(object);
}
