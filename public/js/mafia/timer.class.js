class GameTimer {

    _left = 0;
    maxTime = 0;
	timerInterval = null;
	timerStep = 50;
	game = null;

    timerBlock = null;
    stopwatch = null;

	buttons = {};
	audioContext = new AudioContext();

    constructor({ maxTime = 2000, timerBlock = ".timer", gameEngine = null} ={})
	{
		this.timerBlock = timerBlock;
        if (typeof timerBlock === "string"){
			this.timerBlock = document.querySelector(timerBlock);
        }
		this.stopwatch = this.timerBlock.querySelector('.stopwatch');
		
		let buttons = this.timerBlock.querySelectorAll('[data-timer]');
		buttons.forEach(button => {
			button.addEventListener('click', (event) => this[button.dataset.timer].call(this, event));
			this.buttons[button.dataset.timer] = button;			
		});
		if (gameEngine) {
			this.game = gameEngine;
			this.game.timer = this;
		}
		this.left = this.maxTime = (gameEngine && gameEngine.config.timerMax) ? gameEngine.config.timerMax : maxTime;
	};
	/**
	 * @param {number} value
	 */
	set left(value){
		this._left = value;
		this.stopwatch.innerText = this.inttotime(value);
	}
	/**
	 * @param {number} value
	 */
	get left(){
		return this._left;
	}
	start() {
		this.MainTimer = setInterval(() => this.countdown(), this.timerStep);
	}
	pause() {
		clearInterval(this.MainTimer);
	}
	reset() {
		this.pause();
		this.left = this.maxTime;
	}
	undo() {
		this.game.undo();
	}
	next() {
		this.reset()
		this.game.next();
	}
	countdown() {

		this.left -= 5

		if (this.left < 0)
		{
			this.beep(300, 800);
			this.reset();
			this.next();
			return true;
		}
		
		if ([1200, 1000,500,300,200,100].indexOf(this.left) !== -1){
			this.beep();
		}

	}
	beep(duration=75, frequency=500) {
		let oscillator = this.audioContext.createOscillator();
		oscillator.type = 'sine'; // форма сигнала
		oscillator.frequency.value = frequency; // частота
		oscillator.connect(this.audioContext.destination);
		oscillator.start(); //для запуска
		
		let oscillatorTimer = setTimeout(() => oscillator.stop(), duration);
	};
	inttotime(t)
	{
		let params = [
			new String(Math.floor(t/6000)).padStart(2,'0'),
			new String(Math.floor(t%6000/100)).padStart(2,'0'),
			new String(t%100).padStart(2,'0'),
		];
		return params.join(':');
	}
};
