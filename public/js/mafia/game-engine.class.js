class GameEngine {

    #gameTable = null;

    players = [];
    maxPlayers = 10;

    prevStates = [];
    maxStatesSave = 10;

    get gameTable(){
        return this.#gameTable;
    }
    constructor({ gameTable = null}) {
        if (typeof gameTable === "string") {
            gameTable = document.querySelector(gameTable);
        }
        this.#gameTable = gameTable;
      
        this.init();
    }
    init() {
        for (let index = 0; index < this.maxPlayers; index++) {
            let player = new Player({id: index});
            this.players.push(player);
            this.gameTable.append(player.getRow(index));
        }
    }
    save() {
        let state = {};
        for (let property in this) {
            if (['prevStates', 'timer'].includes(property)) continue;
            state[property] = this[property];
        }
        this.prevStates.push(JSON.stringify(state));

        if (this.prevStates.length > this.maxStatesSave)
            this.prevStates.shift();
        
        return true;
    }
    load(state) {
        state = JSON.parse(state);
        console.log(state);
        for (let property in state) {
            if (property === 'players') {
                this.loadPlayersStates(state[property]);
                continue;
            }
            if (property === 'activeSpeaker') {
                if (state[property])
                    this.activeSpeaker = this.players[state[property].id];
                else
                    this.activeSpeaker = null;
                continue;
            }
            this[property] = state[property];
        }
        return true;
    }
    loadPlayersStates(state) {
        return this.players.forEach((player, index) => player.load(state[index]));
    }
}