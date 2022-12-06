let dblclick_func = false;
const debug = false;

document.body.addEventListener('click', actionHandler.clickCommonHandler);

document.body.querySelectorAll('input[data-action-input]').forEach(element =>
	element.addEventListener('input', (event) => actionHandler.inputCommonHandler.call(actionHandler, event))
);

document.body.querySelectorAll('input[data-action-change]').forEach(element =>
	element.addEventListener('change', (event) => actionHandler.changeCommonHandler.call(actionHandler, event))
);