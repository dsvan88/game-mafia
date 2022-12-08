class MafiaEngine extends GameEngine {

    stage = 'firstNight';
    _stageDescr = '';
    daysCount = -1;
    prevStage = null;
    timer = null;

    debate = false;
    speakers = [];
    shooting = [];
    killed = [];
    bestMove = [];
    lastWill = [];
    debaters = [];
    courtRoom = [];
    leaveThisRound = [];

    reasons = ['', 'Вбит', 'Засуджений', '4 Фола', 'Дісквал.'];

    prevSpeaker = null;
    activeSpeaker = null;
    lastWillReason = null;

    config = {
        getOutHalfPlayers: true,
        killsPerNight: 1,
        timerMax: 6000,
        lastWillTime: 6000,
        debateTime: 3000,
        mutedSpeakTime: 3000,
        courtAfterFouls: true,
    };

    #courtRoomList = null;

    constructor(data){
        super(data);
        this.gameTable.addEventListener("next", (event) => this.next.call(this, event));
        this.stageDescr = 'Нульова ніч.\nПрокидаються Дон та гравці мафії.\nУ вас є хвилина на узгодження дій.';
    }

    get defendant(){
        if (this.debaters.length > 0){
            let defendant = this.debaters.shift();
            return defendant instanceof Player ? defendant : this.players[defendant];
        }
        return null;
    }
    get lastWiller() {
        if (this.lastWill.length > 0){
            let willer = this.lastWill.shift();
            return willer instanceof Player ? willer : this.players[willer];
        }
        return null;
    }
    get courtRoomList(){
        if (this.#courtRoomList)
            return this.#courtRoomList;

        this.#courtRoomList = this.gameTable.closest('.game').querySelector('.courtroom');

        if (this.#courtRoomList)
            return  this.#courtRoomList;

        throw new Error('Element Courtroom not found in DOM tree!');
    }
    /**
     * @param {string} descr
     */
    set stageDescr(descr){
        this._stageDescr = descr;
        let descrBlock = this.gameTable.closest('.game').querySelector('.game__stage');
        descrBlock.innerHTML = descr.replace(/\n/g, '<br>');
    }
    get stageDescr(){
        return this._stageDescr;
    }
    undo() {
        let state = this.prevStates.pop();
        if (this.load(state)) {
            this.stageDescr = this._stageDescr;
            this.resetView();
        }
    };
    getNextStage() {

        if (this.theEnd() && this.stage === 'finish')
            return 'finish';
        if (this.stage === 'shootingNight'){
            this.shootingCheck();
        }
        if (this.stage === 'firstNight' || this.stage === 'shootingNight' && this.lastWill.length === 0 || this.stage === 'actionLastWill' && this.lastWillReason === 1)
            return 'morning';
        else if (this.stage === 'morning' || (this.stage === 'daySpeaker' && this.speakers.length > 0))
            return 'daySpeaker';
        else if ((this.stage === 'daySpeaker' && this.speakers.length === 0) || this.stage === 'actionDebate' && this.debaters.length === 0 && this.courtRoom.length > 0) // Или - добавлено при рефакторинге
            return 'actionCourt';
        else if ( ['actionCourt', 'actionDebate' ].includes(this.stage) && this.debaters.length > 0)
            return 'actionDebate';
        else if ((['actionCourt', 'actionDebate' ].includes(this.stage) || this.stage === 'actionLastWill' && this.prevStage !== 'shootingNight') && this.courtRoom.length === 0 && this.lastWill.length === 0)
            return 'shootingNight';
        else if (['actionCourt', 'actionDebate', 'shootingNight', 'actionLastWill' ].includes(this.stage)  && this.lastWill.length > 0)
            return 'actionLastWill';
    }
    next() {
        this.save();

        this.prevStage = this.stage;
        this.stage = this.getNextStage();

        if (this[this.stage]){
            this[this.stage]();
        }
        else 
            throw new Error('Something went wrong:(');

        this.resetView()
    };
    dispatchNext(){
        this.gameTable.dispatchEvent(new Event("next"));
    }
    resetView() {
        this.clearView();
        this.applyView();
    }
    clearView() {
        this.players.forEach(player => {
            player.row.classList.remove('speaker', 'shooted', 'out', 'best-moved');

            player.putedCell.innerText = '';
            player.putedCell.classList.remove('puted');

            player.primCell.innerText = '';
            for (let foul = 1; foul <= 4; foul++) {
                let foulCell = player.row.querySelector(`[data-foul="${foul}"]`);
                if (foulCell)
                    foulCell.classList.remove('fail');
                if (foul === 3)
                    foulCell.innerText = '';
            }
        });
        this.closeCourtroom();
    };
    applyView() {
        this.players.forEach(player => {
            if (player.puted[this.daysCount] >= 0) {
                player.putedCell.innerText = player.puted[this.daysCount] + 1;
                player.putedCell.classList.add('puted');
            }
            if (player.out) {
                player.row.classList.add('out');
                player.primCell.innerText = this.reasons[player.out];
            }
            if (this.shooting.includes(player.id)){
                player.row.classList.add('shooted');
            }
            if (this.activeSpeaker && this.activeSpeaker.bestMove && this.bestMove.includes(player.id)){
                player.row.classList.add('best-moved');
            }
            if (player.fouls > 0){
                for (let foul = 1; foul <= player.fouls; foul++) {
                    let foulCell = player.row.querySelector(`[data-foul="${foul}"]`);
                    if (foulCell)
                        foulCell.classList.add('fail');
                    if (foul === 3 && player.muted) {
                        foulCell.innerText = '🤐';
                    }
                }
            }
        })
        if (this.activeSpeaker) {
            this.activeSpeaker.row.classList.add('speaker');
        }
        if (this.courtRoom.length > 0)
            this.openCourtroom();
    };
    putPlayer(playerId) {
        if (this.stage === 'finish') {
            this.players[playerId].addDops(playerId);
        }
        else if (this.stage === 'actionLastWill' && this.activeSpeaker.bestMove) {
            this.actionBestMove(playerId)
        }
        else if (this.stage === 'daySpeaker') {
            this.putPlayerOnVote(playerId);
        }
        else if (this.stage === 'shootingNight') {
            this.shootPlayer(playerId);
        }
        this.resetView();
    };
    shootPlayer(playerId) {
        if (this.shooting.includes(playerId))
            return false;
        this.shooting.push(playerId);

        this.log(`Мафія стріляє у гравця №${this.players[playerId].num}!`);

        this.resetView();
    };
    playerFouls(id, foulNum) {
        let player = this.players[id];

        if (player.out > 0) return false;

        if (player.addFouls(foulNum) >= 4) {
            this.outPlayer(id, player.fouls - 1);
            this.leaveThisRound.push(id);
        }
        this.resetView();
    }
    outPlayer(id, reason) {

        this.players[id].out = reason;

        if (reason < 3){
            this.lastWillReason = reason;
            this.lastWill.push(id);
        }
        else this.players[id].muted = false;

        this.log(`Гравець №${this.players[id].num} - залишає наше місто. Причина: ${this.reasons[reason]}!`);
        return true;
    };
    putPlayerOnVote(putedId) {
        if (this.players[putedId].out > 0) {
            this.log(`Не прийнято! За столом нема гравця №${this.players[putedId].num}!`);
            return false;
        }
        let maker = (this.timer.left === this.config.timerMax ? this.players[this.prevSpeaker] : this.activeSpeaker);
        if (!maker) return false;

        if (maker.puted[this.daysCount] > 0 && maker.puted[this.daysCount] !== putedId) return false;

        let check = this.courtRoom.indexOf(putedId);
        if (check === -1) {
            this.courtRoom.push(putedId);
            maker.puted[this.daysCount] = putedId;
            this.log(`Гравець №${maker.num} - виставляє гравця №${this.players[putedId].num} (${this.players[putedId].name})!`);
        }
        else {
            if (maker.puted[this.daysCount] === putedId) {
                this.courtRoom.splice(check, 1);
                maker.puted[this.daysCount] = -1;
                this.log('Помилкове виставлення. Відміна!');
            }
            else {
                this.log(`Гравець №${maker.num} - виставляє гравця № ${this.players[putedId].num}!\nНе прийнято! Вже висталений!`);
                return false;
            }
        }
    };
    shootingCheck() {
        if (this.config.killsPerNight === 1) {
            if (this.shooting.length === 1){
                let killed = this.shooting.pop();
                this.killed[this.daysCount].push(killed);
                if (this.checkFirstKill()){
                    this.players[killed].bestMove = true;
                    const message = `Гравець №${this.players[killed].num} - вбит першим!\nВ нього є право залишити по собі кращій хід`;
                    alert(message);
                    this.log(message);
                }
                return this.outPlayer(killed, 1);
            }
            else {
                this.shooting.length = 0;
                const message = 'Промах! Ніхто не був вбитий цією ніччю.';
                alert(message);
                this.log(message);
            }
        }
        return false;
    }
    morning() {
        ++this.daysCount;
        this.killed.push([]);
        this.players.forEach(player => player.puted[this.daysCount] = -1);

        this.prevSpeaker = null;
        this.speakers = this.getSpeakers();

        this.next();
    }
    getActivePlayersCount(role) {
        let count = this.players.reduce((playersCount, player) => {
            if (player.out > 0) return;
            if (role === 2 && (player.role === 0 || player.role === 4)) return; // Если ищем мафов - отсекаем миров
            if (role === 1 && (player.role === 1 || player.role === 2)) return; // Если ищем миров - отсекаем мафов
            return ++playersCount;
        }, 0)
        return count;
    }
    getSpeakers() {
        let speakers = [];
        let shifted = [];
        let speakerOffset = this.daysCount >= this.maxPlayers ? this.daysCount - this.maxPlayers : this.daysCount;
            
        this.players.forEach((player, index) => {
            if (player.out > 0) return;
            if (index < speakerOffset)
                shifted.push(player.id);
            else
                speakers.push(player.id);
        })
        if (shifted.length > 0) {
            shifted.forEach(playerId => speakers.push(playerId));
        }
        return speakers;
    }
    nextSpeaker() {
        let player;
        for (; ;) {
            player = this.players[this.speakers.shift()];
            if (player === this.activeSpeaker) continue;
            if (player.out > 0 && player.muted) {
                player.unmute();
                continue;
            }
            if (player.out > 0) continue;
            if (!player.muted) return player;
            if (this.getActivePlayersCount() < 5) {
                player.unmute();
                this.timer.left = this.config.mutedSpeakTime;
                return player;
            }
            let put = parseInt(prompt(`Гравець №${player.num} мовчить, але може виставити кандидатуру: `, '0'));
            if (put > 0) {
                this.prevSpeaker = player.id;
                this.putPlayerOnVote(put - 1);
                player.unmute();
            };
        }
    };
    actionCourt() {
        this.activeSpeaker = null;
        if (this.leaveThisRound.length > 0 && this.config.courtAfterFouls)
        {
            let message = `Сьогодні нас ${(this.leaveThisRound.length > 1 ? 'покинули гравці №' + this.courtList(this.leaveThisRound) : 'покинув гравець №' + this.players[this.leaveThisRound.pop()].num)}. Голосування не проводится.`;
            alert(message);
            this.log(message);
            this.courtRoom.length = 0;
            return this.dispatchNext();
        }
        this.stageDescr = 'Зал суда.\nПрохання до гравців припинити будь-яку комунікацію та прибрати руки від стола';
       
        let votesAll = 0,
        playersCount = 0,
        voted = new Map(),
        maxVotes = 0,
        message = `Уважаемые игроки, переходим в зал суда!\nНа ${(this.debate ? 'перестрелке' : 'голосовании')} находятся следующие игроки: ${this.courtList(this.courtRoom)}\n`,
        defendantCount = this.courtRoom.length;
        
        if (defendantCount === 0)
        {
            message += '\nНа голосование никто не выставлен. Голосование не проводится.'
            alert( message );
            this.log(message);
            return this.dispatchNext();
        }
        
        alert(message);

        if (defendantCount === 1)
        {
            message = 'На голосование был выставлен лишь 1 игрок\n';
            let playerId = this.courtRoom.pop();
            if (this.daysCount > 0)
            {
                message += `Наш город покидает игрок №${this.players[playerId].num}}!`;
                alert(message + '\nУ вас есть 1 минута для последней речи');
                this.outPlayer(playerId,2);
            }
            else {
                message += `Этого недостаточно для проведения голосования.`;
                alert(message + '\n\nНаступает фаза ночи!')
            }
            this.log(message);
            return this.dispatchNext();
        }
        votesAll = playersCount = this.getActivePlayersCount();

        message = '';
        while(this.courtRoom.length > 0){
            let playerId = this.courtRoom.shift();
            if (votesAll < 1) {
                voted.set(playerId, 0);
                message += `Игрок  №${this.players[playerId].num} \tГолоса: 0\n`;
                continue;
            }
            let vote = this.courtRoom.length === 1 ? parseInt(prompt(`${this.players[playerId].num}! Кто за то, что бы наш город покинул игрок под № ${this.players[playerId].num}`, '0')) : votesAll;
            message += `Игрок  № ${this.players[playerId].num} \tГолоса: ${vote}\n`;
            if (vote > 0) {
                voted.set(playerId, vote);
                votesAll -= vote;
                if (maxVotes < vote) {
                    maxVotes = vote;
                }
            }
        };
        voted.forEach((votes, playerId) => {
            if (votes === maxVotes){
                this.debaters.push(playerId);
            }
        });
        
        message = `Голоса распределились следующим образом:\n${message}`;
        if (this.debaters.length===1)
        {
            let player = this.defendant;
            message += `\nНас покидает Игрок под № ${player.num}.\nУ вас прощальная минута.`;
            this.outPlayer(player.id, 2);
            alert(message);
            this.log(message);
            return this.dispatchNext();
        }

        let _debaters = this.courtList(this.debaters);
        message += 'В нашем городе перестрелка. Между игроками под номерами: ' + _debaters;

        alert(message);

        if (this.debate && this.debaters.length === defendantCount)
        {
            if (playersCount > 4 || this.config.getOutHalfPlayers)
            {
                let vote = parseInt(prompt(`Кто за то, что все игроки под номерами: ${_debaters} покинули стол?'`,'0'));
                if ( vote > playersCount/2 )
                {
                    message=`Большинство (${vote} из ${playersCount}) - за!\nИгроки под номерами: ${_debaters} покидают стол.`;
                    while(this.debaters.length > 0)
                        this.outPlayer(this.debaters.shift(),2);
                }
                else 
                    message = `Большинство (${playersCount-vote}) из ${playersCount}) - против!\nНикто не покидает стол.`;
            }
            else 
                message = 'При количестве игроков менее 5 нельзя поднять 2 и более игроков.\nНикто не покидает стол.';
            this.debaters.length = 0;
        }
        if (this.debaters.length > 0)
        {
            this.debate = true;
            this.courtRoom = this.debaters.slice(0);
        }

        alert(message);
        this.log(message);
        return this.dispatchNext();
    }
    daySpeaker() {
        this.prevSpeaker = this.activeSpeaker ? this.activeSpeaker.id : null;
        this.activeSpeaker = this.nextSpeaker();
        this.stageDescr = `День №${this.daysCount}\nПромова гравця №${this.activeSpeaker.num}`;
    };
    actionDebate(){
        this.timer.left = this.config.debateTime;
        this.activeSpeaker = this.defendant;
        this.stageDescr = `Перестрілка.\nПромова гравця №${this.activeSpeaker.num}`;
    };
    actionLastWill(){
        this.timer.left = this.config.lastWillTime;
        this.activeSpeaker = this.lastWiller;
        this.stageDescr = `Заповіт.\nПромова гравця №${this.activeSpeaker.num}`;
    };
    actionBestMove(playerId){

        if (!this.activeSpeaker.bestMoveAuthor)
            this.activeSpeaker.bestMoveAuthor = true;

        this.bestMove.push(playerId);
        if (this.bestMove.length === 3)
        {
            const message = `Гравець №${this.activeSpeaker.num} вважає, гравцями мафії, гравців, под номерами: ${this.courtList(this.bestMove)}`;
            if (confirm(message+'?')){
                this.activeSpeaker.bestMove = false;
                this.log(message);
            }
            else {
                this.bestMove.length = 0;
                this.activeSpeaker.bestMoveAuthor = false;
            }
        }
    }
    courtList(list){
        let courtList = '';
        list.forEach(defendant => courtList += `${defendant + 1}, `);
        courtList = courtList.slice(0, -2);
        return courtList;
    }
    shootingNight(){
        const message = 'Мафія підіймає свою зброю та стреляє по гравцям.\nЗробіть Ваш вибір!'
        this.stageDescr = `Ніч №${this.daysCount}.\n${message}`;
        this.log(message);
    }
    openCourtroom(){
        this.courtRoomList.innerText = "На голосование выставлены игроки под номерами: " + this.courtList(this.courtRoom);
    }
    closeCourtroom(){
        this.courtRoomList.innerText = '';
    }
    checkFirstKill(){
        let check = this.killed.reduce((killedCount, killedAtDay) => killedCount + killedAtDay.length, 0);
        return check === 1;
    }
    log(message){
        message = message.replace(/\n/g, '</br>');
        let logBlock = this.gameTable.closest('.game').querySelector('.game__log');
        logBlock.insertAdjacentHTML('beforeend',`
    <div class="game__log-entity">
        <div class="game__log-day">${this.stage === 'shootingNight' ? 'Night' : 'Day'}№ ${this.daysCount}: </div>
        <div class="game__log-events">${message}</div>
    </div>`
        );
    };
    finish(){
        alert(this.stageDescr.replace(/BR/g,'\n'));
    }
    theEnd(winner){
        let message = '',
            red = this.getActivePlayersCount(1),
            mafs = this.getActivePlayersCount(2);
        
        if (mafs===0 || winner === 1)
        {
            this.winners = 1;
            message = 'Мирне місто!\nВід тепер, Ваші діти можуть спати спокійно!';
        }
        else if (mafs >= red || winner === 2)
        {
            this.winners = 2;
            message = "Мафію!\nВід тепер, Ваші діти можуть спати сито й спокійно!";
        }
        if (this.winners)
        {
            this.stageDescr = `Вітаємо з перемогою: ${message}`;
            this.stage = 'finish';
            return true;
        }
        return false;
    }
}