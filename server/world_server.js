import PlayerController from "./player_server.js";
import MiniGameController from "./miniGame_server.js";


export const SCENES = [
    {
        name: 'SceneMainBuilding',
        position: {
            x: 480,
            y: 625
        },
        altEntrances: [
            {
                from: 'SceneMainBuildingBasement',
                x: 470,
                y: 367
            },
            {
                from: 'SceneMainBuildingFirstFloor',
                x: 517,
                y: 367
            }
        ]
    },
    {
        name: 'SceneMainBuildingBasement',
        position: {
            x: 400,
            y: 375
        },
        altEntrances: [
            {
                from: 'MiniGameSnake',
                x: 310,
                y: 505
            }
        ]
    },
    {
        name: 'SceneWorld',
        position: {
            x: 1167,
            y: 613
        }
    }
]

export default class WorldController {

    constructor(io, roomName) {
        this.io = io;
        this.roomName = roomName;
        this.players = [];

        this.miniGames = { // keep track of minigames running in world
            snake: [],
        };
    }


    playerJoin(client_io) {
        let player = new PlayerController(client_io, this)
        this.players.push(player.state);
        client_io.join(this.roomName);

        // send the room's state to the new player
        client_io.emit('currentPlayers', this.players);

        // update all other players of the new player
        this.io.sockets.in(this.roomName).emit('newPlayer', player.state);
        console.log(`${client_io.name} has joined ${this.roomName}`);
        player.state.init = false;
    }

    
    disconnectPlayer(client_io) {
        // remove player from world
        for (let player of this.players) {
            if (player.playerId === client_io.id) {
                this.players.splice(this.players.indexOf(player), 1);
            }
        };
        this.leaveMiniGame(client_io);
        
    }


    startGameInterval() {
    }


    joinMiniGame(miniGameName, client) {

        const SNAKE_MAX_CAPACITY = 5;

        if (miniGameName === 'MiniGameSnake') {

            let snakeGame;
            let snakeGames = this.miniGames.snake;

            if (snakeGames.length === 0) {
                snakeGame = new MiniGameController(this.io, SNAKE_MAX_CAPACITY);
                snakeGame.createLobby(client);
                snakeGames.push(snakeGame);
            } else {
                let self = this;
                Object.keys(snakeGames).forEach(function (i) {
                    if (snakeGames[i].isAcceptingPlayers()) {
                        snakeGame = snakeGames[i];
                        snakeGame.addPlayer(client);
                    } else {
                        snakeGame = new MiniGameController(self.io, SNAKE_MAX_CAPACITY);
                        snakeGame.createLobby(client);
                        snakeGames.push(snakeGame);
                    }
                });
            }

            client.on('keydown', keyCode => {
                snakeGame.handleKeydown(keyCode, client);
            });

            client.once('leaveMiniGame', () => {
                this.leaveMiniGame(client);
            })

            client.once("startGame", () => {
                snakeGame.handleStartGame(miniGameName);
            })
            

        }

    }


    leaveMiniGame(client_io) {
        // remove player from all miniGames they are part of
        let self = this;
        Object.keys(self.miniGames).forEach(function (i) {
            if (self.miniGames[i].length === 0) {
                return;
            }
            for (let game of self.miniGames[i]) {
                for (let player of game.players) {
                    if (player.id === client_io.id) {
                        game.players.splice(game.players.indexOf(player), 1)
                        game.playerLeft(player);
                        client_io.leave(game.gameId);
                    }
                }
                // if no more players in minigame, delete minigame
                if (game.players.length === 0) {
                    
                    if (typeof game.game !== "undefined") {
                        game.game.gameActive = false; // stops game loop
                        game.game.gameOver = true;
                    }

                    self.miniGames[i].splice(self.miniGames[i].indexOf(game), 1);
                    console.log(`Shut down minigame ${game.gameId}`);
                    client_io.removeAllListeners("keydown");
                    client_io.removeAllListeners("startGame");
                    client_io.removeAllListeners("leaveMiniGame");
                }
            }
        })
    }


}
