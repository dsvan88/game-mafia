class GameEngine {

    gameTable = null;

    players = [];
    maxPlayers = 10;

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
}