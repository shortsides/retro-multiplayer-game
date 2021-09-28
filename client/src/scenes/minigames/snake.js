import { playerName, socket } from "../../../index.js";

export default class MiniGameSnake extends Phaser.Scene {

    constructor() {
        super('MiniGameSnake');
    }

    preload() {

    }

    create() {

        const scene = 'MiniGameSnake';

        let self = this;

        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

        function exitGame() {
            // change scene
            socket.off();

            let scenes = {
                old: 'MiniGameSnake',
                new: 'SceneMainBuildingBasement'
            }
            self.scene.start(scenes.new, self);
            self.anims.resumeAll();
            socket.emit("sceneChange", scenes);
            socket.emit("leaveMiniGame");
        }

        // create game html elements
        this.snakeGame = this.add.dom(0, 0).createFromCache("snakeGame")
            .setScrollFactor(0);


        // load titlescreen
        this.titleScreen = this.add.image(0, 0, 'title-snake').setOrigin(0,0);

        const BG_COLOUR = '#231f20';
        const SNAKE_COLOURS = ['SILVER', 'RED', 'BLUE', 'PINK', 'PURPLE'];
        const FOOD_COLOUR = '#e66916';
        const FOOD2_COLOUR = '#3CB371';
        const HEART = '♡';


        socket.on('init', handleInit);
        socket.on('gameState', handleGameState);
        socket.on('gameOver', handleGameOver);
        socket.on('gameStart', handleGameStart);
        socket.on('countdown', handleCountdown);
        socket.on('joinedGame', handleJoinedGame);
        socket.on('playerLeft', handlePlayerLeft);
        
        const gameScreen = document.getElementById('MiniGameScreen');
        const initialScreen = document.getElementById('MiniGameInitialScreen');
        const gameHeader = document.getElementById('gameHeader');
        const exitButton = document.getElementById('exitButton');
        const exitButton2 = document.getElementById('exitButton2');
        const startBtn = document.getElementById('startButton');
        const gameConsole = document.getElementById('gameConsole');
        const livesCount = document.getElementById('livesCount');
        const pointsCount = document.getElementById('pointsCount');
        const playersInLobby = document.getElementById('playersInLobby');
        const waitingMessage = document.getElementById('waitingMessage');

        exitButton.addEventListener('click', exitGame);
        exitButton2.addEventListener('click', exitGame);
        startBtn.addEventListener('click', startGame);
        
        let canvas, ctx;
        let playerNumber;
        let gameActive = false;

        initialScreen.style.display = 'block';
        

        function startGame() {
            socket.emit('startGame', 'MiniGameSnake');
            init();
        }
        
        function init() {
            initialScreen.style.display = 'none';
            gameScreen.style.display = 'block';
        
            canvas = document.getElementById('MiniGameCanvas');
            ctx = canvas.getContext('2d');
        
            // define background size
            canvas.width = 540;
            canvas.height = 540;
        
            // draw background
            ctx.fillStyle = BG_COLOUR;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        
            // activate game
            gameActive = true;
        
        }
        
        function keydown(e) {
            socket.emit('keydown', e.keyCode, playerNumber);
        }
        
        function paintGame(state) {
        
            // draw background
            ctx.fillStyle = BG_COLOUR;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        
            const food = state.food;
            const food2 = state.food2;
            const gridsize = state.gridsize;
            const size = canvas.width / gridsize;
        
            // draw food
            ctx.fillStyle = FOOD_COLOUR;
            ctx.fillRect(food.x * size, food.y * size, size, size);
            ctx.fillStyle = FOOD2_COLOUR;
            ctx.fillRect(food2.x * size, food2.y * size, size, size);
        
            // draw players
            for (let player of state.players) {
                paintPlayer(player, size);
            }
        
            // display any messages
            //gameConsole.innerText = state.message;
        
            // update heading for each player
            if (playerNumber === 1) {
                gameHeader.innerText = `${SNAKE_COLOURS[0]} PLAYER`;
                //gameHeader.style.color = SNAKE_COLOURS[0];
                livesCount.innerText = `${HEART.repeat(state.players[0].lives)}`;
                pointsCount.innerText = state.players[0].points;
            } else if (playerNumber === 2) {
                gameHeader.innerText = `${SNAKE_COLOURS[1]} PLAYER`;
                //gameHeader.style.color = SNAKE_COLOURS[1];
                livesCount.innerText = `${HEART.repeat(state.players[1].lives)}`;
                pointsCount.innerText = state.players[0].points;
            } else if (playerNumber === 3) {
                gameHeader.innerText = `${SNAKE_COLOURS[2]} PLAYER`;
                //gameHeader.style.color = SNAKE_COLOURS[2];
                livesCount.innerText = `${HEART.repeat(state.players[2].lives)}`;
                pointsCount.innerText = state.players[0].points;
            } else if (playerNumber === 4) {
                gameHeader.innerText = `${SNAKE_COLOURS[3]} PLAYER`;
                //gameHeader.style.color = SNAKE_COLOURS[3];
                livesCount.innerText = `${HEART.repeat(state.players[3].lives)}`;
                pointsCount.innerText = state.players[0].points;
            } else if (playerNumber === 5) {
                gameHeader.innerText = `${SNAKE_COLOURS[4]} PLAYER`;
                //gameHeader.style.color = SNAKE_COLOURS[4];
                livesCount.innerText = `${HEART.repeat(state.players[4].lives)}`;
                pointsCount.innerText = state.players[0].points;
            }
        
        }
        
        function paintPlayer(playerState, size) {
            const snake = playerState.snake;
        
            ctx.fillStyle = playerState.colour;
        
            // loop through cells in snake and draw them on canvas
            for (let cell of snake) {
                ctx.fillRect(cell.x * size, cell.y * size, size, size);
            }
        }
        
        function handleInit(number, player_list) {
            playerNumber = number;
            gameHeader.innerText = `${SNAKE_COLOURS[playerNumber - 1]} PLAYER`;
            
            updatePlayerLobby(player_list);

        }
        
        function handleGameState(gameState) {
            if (!gameActive) {
                console.log('game not active');
                return;
            }
            document.addEventListener('keydown', keydown);

            requestAnimationFrame(() => paintGame(gameState));
        }
        
        function handleGameOver(data) {
            if (!gameActive) {
                return;
            }
            
            exitButton2.style.display = 'block';
            gameConsole.innerText = 'GAME OVER';
        
            if (data.winner === playerNumber) {
                gameConsole.innerText = 'YOU WIN!';
            } else {
                gameConsole.innerText = `${SNAKE_COLOURS[data.winner - 1]} PLAYER WINS`;
            }

            resetGame();

        }
    
        function handleJoinedGame(newPlayer, player_list) {
            
            if (newPlayer.name === playerName) {
                return;
            }

            updatePlayerLobby(player_list);
            
        }

        function handlePlayerLeft(player, player_list) {

            if (player.name === playerName) {
                return;
            }
            updatePlayerLobby(player_list);
        }

        function updatePlayerLobby(player_list) {
            playersInLobby.innerHTML = '';
            for (let p of player_list) {
                let el = document.createElement('tr');
                el.innerText = p.name;
                playersInLobby.appendChild(el);
            }
            if (player_list.length > 1) {
                startBtn.style.display = 'block'; // show start button
                waitingMessage.style.display = 'none';
            } else {
                waitingMessage.style.display = 'block';
            }
        }
        
        function handleGameStart() {
            init();
            exitButton2.style.display = 'none';
        }
        
        function resetGame() {
            playerNumber = null;
            gameActive = false;
            document.removeEventListener('keydown', keydown);
        }
        
        function handleCountdown() {
            startBtn.style.display = 'none'; // hide start button
            gameConsole.innerText = 'STARTING GAME...';
            // countdown timer
            var timeleft = 5;
            var downloadTimer = setInterval(function(){
              if(timeleft <= 0){
                clearInterval(downloadTimer);
                gameConsole.innerText = '';
              } else {
                //gameHeader.innerHTML = timeleft;
                gameConsole.innerText = 'STARTING GAME... ' + timeleft;
              }
              timeleft -= 1;
            }, 1000);
        }

    
    
    }

    update(time, delta) {

    }

}