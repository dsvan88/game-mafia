class GameEngine {

    gameTable = null;

    players = [];
    maxPlayers = 10;

    prevStates = [];
    maxStatesSave = 10;

    constructor({ gameTable = null}) {
        if (typeof gameTable === "string") {
            gameTable = document.querySelector(gameTable);
        }
        this.gameTable = gameTable;
      
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
        for (let property of this.savedProps) {
            if (property === 'players') {
                state[property] = this.savePlayersStates();
                continue;
            }
            if (this[property] instanceof Array) {
                state[property] = this.arrayDataCheck(property);
            }
            state[property] = this[property];
        }
        this.prevStates.push(state);

        if (this.prevStates.length > this.maxStatesSave)
            this.prevStates.shift();
        
        return this.prevStates;
    }
    load(state) {
        for (let property of this.savedProps) {
            if (property === 'players') {
                this[property] = this.loadPlayersStates(state.players);
                continue;
            }
            if (this[property] instanceof Array) {
                state[property] = this.arrayDataCheck(property);
            }
            state[property] = this[property];
        }
        this.prevStates.push(state);

        if (this.prevStates.length > this.maxStatesSave)
            this.prevStates.shift();
        
        return this.prevStates;
    }
    savePlayersStates() {
        let state = {};

        this.players.forEach((player, index) => state[index] = player.getState());

        return state;
    }
    loadPlayersStates(state) {
        return this.players.forEach((player) => player.loadState(state));
    }
    arrayDataCheck(property) {
        if (this[property].length === 0)
            return [];
        if (this[property][0] instanceof Player) {
            return this[property].map((player) => player.id);
        }
        return this[property];
    }
}