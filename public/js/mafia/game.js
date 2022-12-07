let Mafia = new MafiaEngine({
    gameTable: ".game__table .game__table-body",
});
let Timer = new GameTimer({
    gameEngine: Mafia,
});

actionHandler.gamePutHim = function (target) {
    let playerRow = target.closest('tr');
    Mafia.putPlayer(parseInt(playerRow.dataset.playerId))
}
actionHandler.gameFouls = function (target) {
    let playerRow = target.closest('tr');
    Mafia.playerFouls(parseInt(playerRow.dataset.playerId), target.dataset.foul)
}
