import SnakeGame from "./snake.js";
import BikeGame from "./bike.js";

export default class MiniGameController {

    constructor(io, maxCapacity) {

        this.io = io;
        this.maxCapacity = maxCapacity;
        this.players = [];
        this.gameId = '';

        this.game;

    }


    createLobby(client) {
        this.gameId = this.makeId(5);
        client.join(this.gameId);
        client.number = 1
        let player = {
            id: client.id,
            name: client.name
        }
        this.players.push(player);
        client.emit('init', client.number, this.players);

        console.log(`bike game ${this.gameId} was initiated by ${player.name}`)

    }


    isAcceptingPlayers() {
        const game = this.io.sockets.adapter.rooms.get(this.gameId);

        let numPlayers = 0;
        if (game) {
            numPlayers = game.size;
        }

        if (numPlayers === 0 || numPlayers > this.maxCapacity) {
            return false;
        }

        if (typeof this.game !== "undefined") {
            if (this.game.gameActive) {
                console.log(`game ${this.gameId} is already in progress`);
                return false;
            }
            if (this.game.gameOver) {
                console.log(`game ${this.gameId} has ended`);
                return false;
            }
        }
        console.log(`Minigame ${this.gameId} is accepting players`);
        return true;

    }
    

    addPlayer(client) {
        const game = this.io.sockets.adapter.rooms.get(this.gameId);

        client.join(this.gameId);
        client.number = game.size;
        let player = {
            id: client.id,
            name: client.name
        }
        this.players.push(player);
        console.log(`player ${player.name} has joined mini game ${this.gameId}`);
        client.emit('init', client.number, this.players);

        this.io.sockets.in(this.gameId).emit('joinedGame', player, this.players);
    }


    playerLeft(player) {
        this.io.sockets.in(this.gameId).emit('playerLeft', player, this.players);
    }


    handleStartGame(miniGameName) {
        

        if (miniGameName === 'MiniGameSnake') {
            console.log(`starting snake mini game ${this.gameId}`);
            this.game = new SnakeGame(this.io, this.gameId);
            this.io.sockets.in(this.gameId).emit('gameStart'); // init game for all clients in room
        }
        if (miniGameName === 'MiniGameBike') {
            console.log(`starting bike mini game ${this.gameId}`);
            this.game = new BikeGame(this.io, this.gameId)
        }
        
    }


    handleKeydown(keycode, client) {
        this.game.handleKeydown(keycode, client.number);
    }

    handleCollectCoins(coin, clientNum) {
        this.game.collectCoin(coin, clientNum);
    }

    
    makeId(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }


}
