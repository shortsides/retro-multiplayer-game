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
            x: 421,
            y: 400
        },
        altEntrances: [
            {
                from: 'MiniGameSnake',
                x: 310,
                y: 510
            }
        ]
    },
    {
        name: 'SceneWorld',
        position: {
            x: 1167,
            y: 630
        },
        altEntrances: [
            {
                from: 'SceneWorldTutorial',
                x: 975,
                y: 625
            },
            {
                from: 'SceneDarkForest',
                x: 1000,
                y: 404
            },
        ]
    },
    {
        name: 'SceneWorldTutorial',
        position: {
            x: 1167,
            y: 630
        },
    },
    {
        name: 'SceneDarkForest',
        position: {
            x: 30,
            y: 381
        }
    },
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

        // listen for player attacks
        client_io.on("attack", attackData => {
            this.handleAttacks(attackData);
        })
    }


    handleAttacks(attackData) {
        for (let p of this.players) {

            if (attackData.victimId === p.playerId) {
                p.health -= attackData.damage;
                console.log(`${p.name} took ${attackData.damage} damage`);

                // if player is dead, remove player
                if (p.health <1) {
                    console.log(`${p.name} died`)
                    p.isDead = true;
                }

                // emit to all players that the player was damaged
                this.io.sockets.in(this.roomName).emit('playerDamaged', p);

            }
        }
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


    joinMiniGame(miniGameName, client) {

        const SNAKE_MAX_CAPACITY = 5;

        if (miniGameName === 'MiniGameSnake') {

            let snakeGame = false;
            let snakeGames = this.miniGames.snake;

            if (snakeGames.length === 0) {
                snakeGame = new MiniGameController(this.io, SNAKE_MAX_CAPACITY);
                snakeGame.createLobby(client);
                snakeGames.push(snakeGame);
                console.log('no snake games, creating new one');
            } else {
                let self = this;
                for (let game of snakeGames) {
                    if (game.isAcceptingPlayers()) {
                        snakeGame = game;
                        snakeGame.addPlayer(client);
                        break;
                    }
                }
                if (!snakeGame) {
                    snakeGame = new MiniGameController(self.io, SNAKE_MAX_CAPACITY);
                    snakeGame.createLobby(client);
                    snakeGames.push(snakeGame);
                    console.log('all snake games are full, creating new one');
                }
                
            }

            console.log(snakeGames);

            client.on('keydown', keyCode => {
                snakeGame.handleKeydown(keyCode, client);
            });

            client.on('leaveMiniGame', () => {
                this.leaveMiniGame(client);
            })

            client.once("startGame", () => {
                console.log(snakeGame.gameId); // note: this must be called once so snakeGame is reset when joining a second game
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
