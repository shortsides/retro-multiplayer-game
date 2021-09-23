import { socket } from "../../../index.js";

export default class MiniGameSnake extends Phaser.Scene {

    constructor() {
        super('MiniGameSnake');
    }

    init() {

    }

    preload() {
        // load game html elements
        this.load.html("snakeGame", "src/scenes/minigames/snake.html");
    }

    create() {

        const scene = 'MiniGameSnake';

        let self = this;

        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

        let text = this.add.text(screenCenterX, 16, 'Snake', {
            font: "18px Monospace", 
            fill: "#fff"
        })
        .setOrigin(0.5);

        let exitButton = this.add.rectangle(754, 16, 30, 30, 0xa6140a)
        .setStrokeStyle(4, 0xffffff)
        .setOrigin(0,0)
        .setInteractive()


        exitButton.on('pointerdown', function (pointer) {

            console.log('click');

            // change scene
            socket.off();

            let scenes = {
                old: 'MiniGameSnake',
                new: 'SceneMainBuildingBasement'
            }
            self.scene.start(scenes.new, self);
            self.anims.resumeAll();
            socket.emit("sceneChange", scenes);
            
        })

        // create game html elements
        this.snakeGame = this.add.dom(screenCenterX, screenCenterY).createFromCache("snakeGame")
            .setScrollFactor(0);

        const BG_COLOUR = '#231f20';
        const SNAKE_COLOURS = ['Silver', 'Red', 'Blue', 'Pink', 'Purple'];
        const FOOD_COLOUR = '#e66916';
        const FOOD2_COLOUR = '#3CB371';
        const HEART = '❤️';


        socket.on('init', handleInit);
        socket.on('gameState', handleGameState);
        socket.on('gameOver', handleGameOver);
        socket.on('gameCode', handleGameCode);
        socket.on('unknownGame', handleUnknownGame);
        socket.on('tooManyPlayers', handleTooManyPlayers);
        socket.on('gameStart', handleGameStart);
        socket.on('countdown', handleCountdown);
        socket.on('joinedGame', handleJoinedGame);
        
        const gameScreen = document.getElementById('gameScreen');
        const initialScreen = document.getElementById('initialScreen');
        const newGameBtn = document.getElementById('newGameButton');
        const joinGameBtn = document.getElementById('joinGameButton');
        const gameCodeInput = document.getElementById('gameCodeInput');
        const gameCodeDisplay = document.getElementById('gameCodeDisplay');
        const gameHeader = document.getElementById('gameHeader');
        const gameCodeH1 = document.getElementById('gameCodeH1');
        const rematchButton = document.getElementById('rematchButton');
        const startBtn = document.getElementById('startButton');
        const gameConsole = document.getElementById('gameConsole');
        const livesCount = document.getElementById('livesCount');
        const pointsCount = document.getElementById('pointsCount');
        
        newGameBtn.addEventListener('click', newGame);
        joinGameBtn.addEventListener('click', joinGame);
        rematchButton.addEventListener('click', rematchGame);
        startBtn.addEventListener('click', startGame);
        
        let canvas, ctx;
        let playerNumber;
        let gameActive = false;
        
        function newGame() {
            socket.emit('newGame');
            init();
        }
        
        function joinGame(){
            const code = gameCodeInput.value;
            socket.emit('joinGame', code);
            init();
        }
        
        function rematchGame() {
            const code = gameCodeDisplay.innerText;
            socket.emit('rematch', code);
        }
        
        function startGame() {
            const code = gameCodeDisplay.innerText;
            socket.emit('startGame', code);
        }
        
        function init() {
            initialScreen.style.display = 'none';
            gameScreen.style.display = 'block';
        
            canvas = document.getElementById('canvas');
            ctx = canvas.getContext('2d');
        
            // define background size
            canvas.width = 800;
            canvas.height = 600;
        
            // draw background
            ctx.fillStyle = BG_COLOUR;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        
            // activate game
            document.addEventListener('keydown', keydown);
            gameActive = true;
        
            // hide rematch button
            rematchButton.style.display = 'none';
        }
        
        function keydown(e) {
            socket.emit('keydown', e.keyCode);
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
            gameConsole.innerText = state.message;
        
            // update heading for each player
            gameCodeH1.style.display = "none";
            if (playerNumber === 1) {
                gameHeader.innerText = `${SNAKE_COLOURS[0]} Player`;
                //gameHeader.style.color = SNAKE_COLOURS[0];
                livesCount.innerText = `${HEART.repeat(state.players[0].lives)}`;
                pointsCount.innerText = state.players[0].points;
            } else if (playerNumber === 2) {
                gameHeader.innerText = `${SNAKE_COLOURS[1]} Player`;
                //gameHeader.style.color = SNAKE_COLOURS[1];
                livesCount.innerText = `${HEART.repeat(state.players[1].lives)}`;
                pointsCount.innerText = state.players[0].points;
            } else if (playerNumber === 3) {
                gameHeader.innerText = `${SNAKE_COLOURS[2]} Player`;
                //gameHeader.style.color = SNAKE_COLOURS[2];
                livesCount.innerText = `${HEART.repeat(state.players[2].lives)}`;
                pointsCount.innerText = state.players[0].points;
            } else if (playerNumber === 4) {
                gameHeader.innerText = `${SNAKE_COLOURS[3]} Player`;
                //gameHeader.style.color = SNAKE_COLOURS[3];
                livesCount.innerText = `${HEART.repeat(state.players[3].lives)}`;
                pointsCount.innerText = state.players[0].points;
            } else if (playerNumber === 5) {
                gameHeader.innerText = `${SNAKE_COLOURS[4]} Player`;
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
        
        function handleInit(number) {
            playerNumber = number;
            gameHeader.innerText = `${SNAKE_COLOURS[playerNumber - 1]} Player`;
        }
        
        function handleGameState(gameState) {
            if (!gameActive) {
                console.log('game not active');
                return;
            }
            requestAnimationFrame(() => paintGame(gameState));
        }
        
        function handleGameOver(data) {
            if (!gameActive) {
                return;
            }
            gameActive = false;
            rematchButton.style.display = 'block';
            gameHeader.innerHTML = "GAME OVER";
        
            if (data.winner === playerNumber) {
                gameConsole.innerText = 'You Win!'
            } else {
                gameConsole.innerText = `${SNAKE_COLOURS[data.winner - 1]} Player Wins`
            }
        }
        
        function handleGameCode(gameCode) {
            // display game code to user
            gameCodeDisplay.innerText = gameCode;
        }
        
        function handleUnknownGame() {
            reset();
            alert("Unknown game code");
        }
        
        function handleTooManyPlayers() {
            reset();
            alert("This game is already in progress");
        }
        
        function handleJoinedGame(playerNum) {
            gameConsole.innerText = `${SNAKE_COLOURS[playerNum - 1]} player has joined. Total players ${playerNum}.`;
            startBtn.style.display = 'block'; // show start button
        }
        
        function handleGameStart() {
            init();
        }
        
        function reset() {
            playerNumber = null;
            gameCodeInput.value = "";
            gameCodeDisplay.innerText = "";
            initialScreen.style.display = "block";
            gameScreen.style.display = "none";
        }
        
        function handleCountdown() {
            startBtn.style.display = 'none'; // hide start button
            gameCodeH1.style.display = 'none';
            gameConsole.innerText = 'Starting Game...';
            // countdown timer
            var timeleft = 5;
            var downloadTimer = setInterval(function(){
              if(timeleft <= 0){
                clearInterval(downloadTimer);
                gameConsole.innerText = '...';
              } else {
                //gameHeader.innerHTML = timeleft;
                gameConsole.innerText = 'Starting Game... ' + timeleft;
              }
              timeleft -= 1;
            }, 1000);
        }

    
    
    }

    update(time, delta) {

    }

}