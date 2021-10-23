
export default class BikeGame {

        constructor(io, gameId) {

            this.io = io;
            this.gameId = gameId;

            this.state = {};
            this.gameActive = false;
            this.gameOver = false;

            this.initGame();
        }
    

        initGame() {
            const room = this.io.sockets.adapter.rooms.get(this.gameId);
            console.log(room)
            const numberOfPlayers = room.size;

            console.log(`starting bike game ${this.gameId} with ${numberOfPlayers} players`);

            this.state = this.createGameState(numberOfPlayers);

            const bikeTypes = []

            for (var i=0; i < numberOfPlayers; i++) {
                const bike = this.selectBikeType(); // select random bike type for each player
                bikeTypes.push(bike);
            }
            
            this.io.sockets.in(this.gameId).emit('countdown', bikeTypes); // client countdown
    
            // server countdown
            let self = this;
            var timeleft = 5;
            var timer = setInterval(function(){
              if(timeleft <= 0){
                clearInterval(timer);
                self.startGameInterval(); // start game
              }
              timeleft -= 1;
            }, 1000);
        }

        selectBikeType() {
            const bikeTypes = [
                {
                    name: 'Road Bike',
                    roadSpeed: 250,
                    hillSpeed: 100,
                    dirtSpeed: 100,
                },
                {
                    name: 'Mountain Bike',
                    roadSpeed: 200,
                    hillSpeed: 180,
                    dirtSpeed: 100,
                },
                {
                    name: 'Dirt Bike',
                    roadSpeed: 200,
                    hillSpeed: 100,
                    dirtSpeed: 200,
                },
                {
                    name: 'Bowler Bike',
                    roadSpeed: 180,
                    hillSpeed: 100,
                    dirtSpeed: 100,
                }
            ]
            // return random bike
            return bikeTypes[Math.floor(Math.random() * bikeTypes.length)];

        }

        startGameInterval() {
            this.gameActive = true;
            this.io.sockets.in(this.gameId).emit('gameStart');
        }
        
        emitGameOver(winner, players) {
            this.gameOver = true;
            this.io.sockets.in(this.gameId).emit('gameOver', winner, players);
        }

        collectCoin(coin, playerNum) {
            if (!this.gameActive) {
                return;
            }

            let coinNum;
            try {
                coinNum = parseInt(coin);
    
            } catch(e) {
                console.error(e);
                return;
            }

            let selectedCoin = this.state.coins.find(x => x.id === coinNum)
            let player = this.state.players.find(x => x.name === playerNum)
              
            if (selectedCoin.available) {
                selectedCoin.available = false;
                player.score += 10;
            } else {
                console.log(`${playerNum} narrowly missed getting the coin`);
                return;
            }

            playerNum = parseInt(playerNum);
            console.log(`${playerNum} collected a coin`);
            this.state.message = `${playerNum} collected a coin`;

            this.io.sockets.in(this.gameId).emit('scoreUpdate', player, coin);

            this.checkWinner();
        }

        checkWinner() {

            // if any coins are left, exit
            for (let c of this.state.coins) {
                if (c.available) {
                    return;
                }
            }
            // else, confirm who won
            let winner;
            let highestScore = 0;
            for (let player of this.state.players) {
                if (player.score > highestScore) {
                    highestScore = player.score;
                    winner = player.name;
                }
            }
            this.io.sockets.in(this.gameId).emit('gameOver', winner, this.state.players);
            return;
        }

        createGameState (numberOfPlayers) {
            let gameState = {
                players: [{
                    name: 1,
                    score: 0,
                }, {
                    name: 2,
                    score: 0,
                }],
                message: '...',
                coins: [
                    {id: 0, available: true},
                    {id: 1, available: true},
                    {id: 2, available: true},
                    {id: 3, available: true},
                    {id: 4, available: true},
                    {id: 5, available: true},
                    {id: 6, available: true},
                    {id: 7, available: true},
                    {id: 8, available: true},
                    {id: 9, available: true},
                    {id: 10, available: true},
                    {id: 11, available: true},
                    {id: 12, available: true},
                    {id: 13, available: true},
                    {id: 14, available: true}
                ]
            };
        
            const player3 = {
                name: 3,
                score: 0,
            };
        
            const player4 = {
                name: 4,
                score: 0,
            };
        
            const player5 = {
                name: 5,
                score: 0,
            };
            
            if (numberOfPlayers === 2) {
                return gameState;
            } else if (numberOfPlayers === 3) {
                gameState.players.push(player3);
                return gameState;
            } else if (numberOfPlayers === 4) {
                gameState.players.push(player3, player4);
                return gameState;
            } else if (numberOfPlayers === 5) {
                gameState.players.push(player3, player4, player5);
                return gameState;
            }
        }

}
