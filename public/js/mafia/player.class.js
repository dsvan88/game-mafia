class Player {
    id = '0';
    num = 0;
    name = 'Player';
    fouls = 0;
    prim = ''

    dops = 0.0;

    muted = false;
    out = false;
    bestMove = false;

    puted = {};

    #row = null;
    #putedCell = null
    #primCell = null;

    constructor(playerData = null) {
        if (playerData) {
            for (let property in playerData) {
                this[property] = playerData[property];
            }
        }
    }

    get row() {
        return this.#row;
    }

    get putedCell() {
        return this.#putedCell;
    }

    get primCell() {
        return this.#primCell;
    }

    getRow(index) {
        this.#row = document.createElement('tr');
        this.row.dataset.playerId = index;

        this.num = index + 1;
        let num = document.createElement('td');
        num.innerText = this.num;
        num.dataset.actionDblclick = 'game-put-him';
        this.row.append(num);

        let nick = document.createElement('td');
        nick.innerText = this.name+index;
        nick.dataset.actionDblclick = 'game-put-him';
        this.row.append(nick);

        this.#putedCell = document.createElement('td');
        this.row.append(this.putedCell);

        for (let foul = 1; foul < 5; foul++){
            let cell = document.createElement('td');
            cell.dataset.actionDblclick = 'game-fouls';
            cell.dataset.foul = foul;
            this.row.append(cell);
        }
        
        this.#primCell = document.createElement('td');
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
    addFouls(foulNum) {
        if (foulNum === '1' && this.fouls > 0){
            this.fouls--;
        }
        else if (foulNum === '4'){
            this.fouls = confirm(`Гравець №${this.num} (${this.name}) отримав дискваліфікуючий фол?`) ? 5 : this.fouls + 1;
        }
        else {
            this.fouls++;
        }
        if (this.fouls === 3) {
            this.muted = true;
        }
        return this.fouls;
    }
    unmute() {
        this.muted = false;
    }
    load(state) {
        for (let property of this.state) {
            this[property] = state[property];
        }
        return this;
    }
}