class MafiaEngine extends GameEngine {

    stage = 'firstNight';
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

    reasons = ['', 'Убит', 'Осуждён', '4 Фола', 'Дисквал.'];

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

    instancesPlayers = [
        'players',
        'activeSpeaker',
    ];

    #courtRoomList = null;

    constructor(data){
        super(data);
        this.gameTable.addEventListener("next", (event) => this.next.call(this, event));
    }

    get defendant(){
        if (this.debaters.length > 0){
            let defendant = this.debaters.shift();
            return defendant instanceof Player ? defendant : this.players[defendant];
        }
        return null;
    }
    get lastWiller(){
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
    undo() {
        console.log('game.undo');
    };
    getNextStage() {
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
        console.log(this.save());
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
                console.log(player.fouls);
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

        // save_log(`Игрок №${id+1} покидает наш город. Причина: ${this.reasons[reason]}!`);
        return true;
    };
    putPlayerOnVote(putedId) {
        if (this.players[putedId].out > 0) {
            alert('Не принято!\nЗа столом нет такого игрока.');
            return false;
        }
        let maker = (this.timer.left === this.config.timerMax ? this.players[this.prevSpeaker] : this.activeSpeaker);
        if (!maker) return false;

        if (maker.puted[this.daysCount] > 0 && maker.puted[this.daysCount] !== putedId) return false;

        let check = this.courtRoom.indexOf(putedId);
        if (check === -1) {
            this.courtRoom.push(putedId);
            maker.puted[this.daysCount] = putedId;
            // save_log('Игрок №'+(act+1)+' выставил игрока №'+i+' на голосование!');
        }
        else {
            if (maker.puted[this.daysCount] === putedId) {
                this.courtRoom.splice(check, 1);
                maker.puted[this.daysCount] = -1;
                // save_log('Ошибочное выставление. Отмена!');
            }
            else {
                alert('Не принято!\nУже выстален.');
                // save_log('Игрок №'+(act+1)+' выставил игрока №'+i+' на голосование.BRНе принято - уже выставлен!');
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
                    alert(`Гравець №${this.players[killed].num} - вбит першим!\nВ нього є право залишити по собі кращій хід`);
                }
                return this.outPlayer(killed, 1);
            }
            else {
                this.shooting.length = 0;
                alert('Промах! Никто не был убит этой ночью.');
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
    getActivePlayers(role) {
        let count = 0;
        this.players.forEach(player => {
            if (player.out > 0) return;
            if (role === 2 && (player.role === 0 || player.role === 4)) return; // Если ищем мафов - отсекаем миров
            if (role === 1 && (player.role === 1 || player.role === 2)) return; // Если ищем миров - отсекаем мафов
            ++count;
        })
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
            if (this.getActivePlayers() < 5) {
                player.unmute();
                this.timer.left = this.config.mutedSpeakTime;
                return player;
            }
            let put = parseInt(prompt(`Игрок №${player.num} молчит, но может выставить кандидатуру: `, '0'));
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
            alert(`Сьогодні нас ${(this.leaveThisRound.length > 1 ? 'покинули гравці №' + this.courtList(this.leaveThisRound) : 'покинув гравець №' + this.players[this.leaveThisRound.pop()].num)}. Голосування не проводится.`);
            this.courtRoom.length = 0;
            return this.dispatchNext();
        }
        // set_PhaseState('Зал суда.BRПросьба убрать руки от стола, прекратить жестикуляцию и агитацию.BRНа '+(d===0 ? 'голосовании' : 'перестрелке')+' находятся следующие игроки: '+vars.currentVote.join(', '));
        
        let votesAll = 0,
        playersCount = 0,
        voted = new Map(),
        maxVotes = 0,
        message = `Уважаемые игроки, переходим в зал суда!\nНа ${(this.debate ? 'перестрелке' : 'голосовании')} находятся следующие игроки: ${this.courtList(this.courtRoom)}\n`,
        defendantCount = this.courtRoom.length;
        
        if (defendantCount === 0)
        {
            alert(message + '\nНа голосование никто не выставлен. Голосование не проводится.');
            return this.dispatchNext();
        }
        
        alert(message);

        if (defendantCount === 1)
        {
            message = 'На голосование был выставлен лишь 1 игрок\n';
            let playerId = this.courtRoom.pop();
            if (this.daysCount > 0)
            {
                alert(`${message}Наш город покидает игрок №${this.players[playerId].num}}!\nУ вас есть 1 минута для последней речи`);
                this.outPlayer(playerId,2);
            }
            else
                alert(`${message}Этого недостаточно для проведения голосования.\n\nНаступает фаза ночи!`)
            return this.dispatchNext();
        }
        votesAll = playersCount = this.getActivePlayers();

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
            this.lastWill.push(player.id);
            alert(message);
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
        return this.dispatchNext();
    }
    daySpeaker() {
        this.prevSpeaker = this.activeSpeaker ? this.activeSpeaker.id : null;
        this.activeSpeaker = this.nextSpeaker();
    };
    actionDebate(){
        this.timer.left = this.config.debateTime;
        this.activeSpeaker = this.defendant;
    };
    actionLastWill(){
        this.timer.left = this.config.lastWillTime;
        this.activeSpeaker = this.lastWiller;
    };
    actionBestMove(playerId){

        if (!this.activeSpeaker.bestMoveAuthor)
            this.activeSpeaker.bestMoveAuthor = true;

        this.bestMove.push(playerId);
        if (this.bestMove.length === 3)
        {
            if (confirm(`Игрок №${this.activeSpeaker.num} назвал, игроками мафии, игроков, под номерами: ${this.courtList(this.bestMove)}?`))
                this.activeSpeaker.bestMove = false;
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
        alert('Мафия поднимает своё оружие и стреляет по игрокам. Сделайте свой выбор!');
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
}