class Player {
    id = '0';
    name = 'Player';
    fouls = 0;
    prim = ''

    dops = 0.0;

    muted = false;
    out = false;

    puted = {};

    num = null;
    row = null;
    putedCell = null
    primCell = null;

    constructor(playerData = null) {
        if (playerData) {
            for (let property in playerData) {
                this[property] = playerData[property];
            }
        }
    }

    getRow(index) {
        this.row = document.createElement('tr');
        this.row.dataset.playerId = index;

        let num = document.createElement('td');
        num.innerText = index + 1;
        num.dataset.actionDblclick = 'game-put-him';
        this.row.append(num);
        this.num = index + 1;

        let nick = document.createElement('td');
        nick.innerText = this.name+index;
        nick.dataset.actionDblclick = 'game-put-him';
        this.row.append(nick);

        let puted = document.createElement('td');
        this.row.append(puted);
        this.putedCell = puted;

        for (let foul = 1; foul < 5; foul++){
            let cell = document.createElement('td');
            // cell.className = 'fail';
            cell.dataset.actionDblclick = 'game-fouls';
            cell.dataset.foul = foul;
            this.row.append(cell);
        }
        
        this.primCell = document.createElement('td');
        this.primCell.innerText = this.prim + index;
        this.row.append(this.primCell);
        
        return this.row;
    }
    addDops(id)
    {
        let points = prompt(`Дополнительные баллы!\nНа Ваше усмотрение, сколько можно добавить баллов игроку №${id+1} (${this.name})?`,'0.0')
        if (points && points != 0.0)
        {
            points = parseFloat(points);
            alert(`Игроку №${id + 1} ${(points > 0.0 ? ' добавлено ' : ' назначен штраф в ')} ${points} баллов рейтинга`);

            this.dops += points;
        }
    }
}