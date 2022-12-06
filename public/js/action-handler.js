actionHandler = {
	changeCommonHandler: function (event) {
		const type = camelize(event.target.dataset.actionChange);
		if (debug) console.log(type);
		try {
			actionHandler[type](event);
		} catch (error) {
			// alert(`Не существует метода для этого action-change: ${type}... или возникла ошибка. Сообщите администратору!\r\n${error.name}: ${error.message}`);
			console.log(error);
		}

	},
    clickCommonHandler: function (event) {
        let target = event.target;
		if (!("actionClick" in target.dataset) || !("actionDblclick" in target.dataset)) {
            target = target.closest(['*[data-action-click],*[data-action-dblclick]']);
			if (!target) return false;
		}
		if (!target) return false;

		if ("actionDblclick" in target.dataset) {
			if (dblclick_func !== false) {
				clearTimeout(dblclick_func);
				dblclick_func = false;
				actionHandler.clickFunc(target, event, 'actionDblclick');
			}
			else {
				dblclick_func = setTimeout(() => {
					if (dblclick_func !== false) {
						clearTimeout(dblclick_func);
						dblclick_func = false;
						actionHandler.clickFunc(target, event);
					};
				}, 200)
			}
		}
		else{
			actionHandler.clickFunc(target, event);
		}
	},
	clickFunc: async function (target, event, method = 'actionClick') {
		if (!(method in target.dataset)) return false;
		event.preventDefault();

		if ("mode" in target.dataset) {
			if (target.dataset['mode'] === 'location') {
				window.location = target.dataset[method]
				return true;
			}
		}
		const type = camelize(target.dataset[method].replace(/\//g, '-'));
		if (debug) console.log(type);
		if (actionHandler[type]) {
			try {
				actionHandler[type](target, event);
			} catch (error) {
				alert(`Возникла ошибка в методе ${method}: ${type}. Свяжитесь с разработчиком или администратором!\n${error.name}: ${error.message}`);
				console.log(error);
			}
		}
		else {
			let action = target.dataset[method];
			let modal = false;
			if (action.endsWith('/form')) {
				modal = this.commonFormEventStart();
			}

			const formData = new FormData;
			for (let [key, value] of Object.entries(target.dataset)) {
				if (key !== method)
					formData.append(key, value);
            }

            let result = await request({
                url: action,
                data: formData,
            });

            if (result["error"]) {
                alert(result["message"]);
                if (modal) {
                    actionHandler.commonFormEventEnd({ modal, result });
                }
                return false;
            }
            else {
                if (result["message"]) {
                    alert(result["message"]);
                }
                if (result["location"]){
                    window.location = result["location"];
                } else if (result["modal"]) {
                    let formId = camelize(action.replace(/\//g, '-'));
                    let isModalDone = await actionHandler.commonFormEventEnd({ modal, data: result, customFormSubmitAction: formId + 'Submit' })

					if (isModalDone && actionHandler[formId + "Ready"]){
						actionHandler[formId + "Ready"]({ modal, data: result });
					}
					else {
						actionHandler["commonFormEventReady"]({ modal, data: result });
					}
                }
            }
		}
	},
	commonFormEventStart: function () {
		return new ModalWindow();
	},
	commonFormEventEnd: async function ({ modal, data, customFormSubmitAction = null, ...args }) {
		let modalWindow;
		if (data['error']){
			modalWindow = modal.fillModalContent({ html: data['html'], title: 'Error!', buttons: [{ 'text': 'Okay', 'className': 'modal-close positive' }] });
		}else{
			modalWindow = modal.fillModalContent(data);
		};

		if (data["jsFile"]) {
			addScriptFile(data["jsFile"]);
		};

		if (data["cssFile"]) {
			addCssFile(data["cssFile"]);
		};

		if (data['html']) {
			const form = modalWindow.querySelector('form');
			if (form){
                const action = customFormSubmitAction || commonFormSubmitHandler;
                form.addEventListener('submit', (event) => actionHandler[action]({ event, modal, args }))
			}
		}
		return true;
	},
	commonFormEventReady: function ({ modal = null, data = {}, type = null}) {
		let firstInput = modal.querySelector("input");
		if (firstInput) {
			firstInput.focus();
		}
		let form = modal.querySelector("form");
		if (form) {
			form.addEventListener("submit", (submitEvent) => {
				submitEvent.preventDefault();
				actionHandler[type](modal);
			});
		}
		if (data["javascript"]) {
			window.eval(data["javascript"]);
		}
	},
	commonFormSubmitHandler: async function ({ event }) {
		event.preventDefault();
		let formData = new FormData(event.target);
		let result = await request({
			url: event.target.action.replace(window.location.origin+'/', ''),
			data: formData,
        });
        if (result["message"]) {
            alert(result["message"]);
        }
        if (result["error"]) {
            return false;
        }
        if (result["location"]){
            window.location =  result["location"];
        }
		return true;
	}
};
