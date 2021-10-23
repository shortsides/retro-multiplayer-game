import { devMode, SPRITES } from "../../../index.js";
import { playerName, socket } from "../../../index.js";
import { playerSprite } from "../../../index.js";

import PlayerManager from "../../player_manager.js";
import Cursors from "../../cursors.js";

export default class MiniGameBike extends Phaser.Scene {

    constructor() {
        super('MiniGameBike');
    }

    init() {
        this.gameActive = false;
        this.stoppedLog = true;
        this.otherPlayers;
        this.dialogueActive = false;
        this.allowedActions = {
            move: true,
            attack: false,
        }

        this.score = 0;
        this.playerNumber;
        this.terrain = 'road';
        this.bikeType = null;

        /*
        this.roadSpeed = 250;
        this.hillSpeed = 100;
        this.dirtSpeed = 170;
        */
    }

    preload() {

    }

    create() {

        const scene = 'MiniGameBike';

        let self = this;

        // create game html elements
        this.bikeGame = this.add.dom(0, 0).createFromCache("bikeGame")
            .setScrollFactor(0);

        let miniGameName = scene;
        setTimeout(() => { 
            socket.emit("joinMiniGame", miniGameName);
        }, 1000);
        
        socket.on('init', function(a, b) { self.handleInit(a, b)});
        socket.on('gameOver', function(a, b) { self.handleGameOver(a, b)});
        socket.on('gameStart', function() { self.handleGameStart(); });
        socket.on('countdown', function(a) { self.handleCountdown(a)});
        socket.on('joinedGame', function(a, b) { self.handleJoinedGame(a, b)});
        socket.on('playerLeft', function(a, b) {self.handlePlayerLeft(a, b)});
        socket.on('scoreUpdate', function(a, b) { self.handleScoreUpdate(a, b)});

        this.gameScreen = document.getElementById('MiniGameScreen');
        this.initialScreen = document.getElementById('MiniGameInitialScreen');
        this.countDown = document.getElementById('countDown');
        this.countDownScreen = document.getElementById('CountDownScreen');
        this.endGameScreen = document.getElementById('EndGameScreen');
        this.gameHeader = document.getElementById('gameHeader');
        this.exitButton = document.getElementById('exitButton');
        this.exitButton2 = document.getElementById('exitButton2');
        this.startBtn = document.getElementById('startButton');
        this.gameConsole = document.getElementById('gameConsole');
        this.livesCount = document.getElementById('livesCount');
        this.pointsCount = document.getElementById('pointsCount');
        this.playersInLobby = document.getElementById('playersInLobby');
        this.waitingMessage = document.getElementById('waitingMessage');

        this.exitButton.addEventListener('click', function() {
            self.exitGame();
        });
        this.exitButton2.addEventListener('click', function() {
            self.exitGame();
        });
        this.startBtn.addEventListener('click', function() {
            self.startGame(self);
        });

        this.initialScreen.style.display = 'block';
        

    
        const map = this.make.tilemap({ key: "map-bike" });
    
        // Load tileset
        const tileset = map.addTilesetImage("atlas_32x", "tiles-world");
    
        // Create layers
        const floorLayer = map.createLayer("Floor", tileset, 0, 0);
        const belowLayer = map.createLayer("Below Player", tileset, 0, 0);
        const worldLayer = map.createLayer("World", tileset, 0, 0);
        const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);
    
        worldLayer.setCollisionByProperty({ collides: true });
        //aboveLayer.setDepth(10);

        this.spawnPoints = [];
        for (var i = 0; i < 15; i++) {

            let point = map.findObject("Spawn Points", obj => obj.name === `${i}`);
            this.spawnPoints.push(point);
        }

        // Create cursor keys
        const cursors = new Cursors(this);

        // Debug graphics
        if (devMode) {
            cursors.debugGraphics(this, worldLayer);
        }

        // Create inventory UI
        this.inventoryUI = this.add.dom(616, 16).createFromCache("inventory")
        .setScrollFactor(0)
        .setDepth(30)
        
        // Create player manager in scene
        this.playerManager = new PlayerManager(scene);
        
        // Turn off camera initially until player info is loaded from server
        this.cameras.main.visible = false;



        async function spawnThisPlayer (players) {
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId === socket.id) {
                    self.playerManager.addPlayer(self, players[id], worldLayer, map);
                    self.afterPlayerSpawn(players[id].objects);
                    console.log('this player spawned');
                }
            });
            return;
        }

        async function spawnAllPlayers (players) {
            // First spawn this player
            await spawnThisPlayer(players);

            // Then spawn other players
            self.otherPlayers = self.physics.add.group();
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId !== socket.id) {
                    self.playerManager.addOtherPlayers(self, players[id], worldLayer);;
                }
            });
            console.log('all players spawned');
        }

        // When this player joins, spawn all current players in room
        socket.on('currentPlayers', spawnAllPlayers);

        
        // When a new player joins, spawn them
        socket.on('newPlayer', function (playerInfo) {
            if (playerInfo.scene !== scene) {
                return;
            }
            if (playerInfo.playerId === socket.id) {
                return;
            }
            /*
            if (playerInfo.init === true) {
                chat.alertRoom(self, `${playerInfo.name} joined the game.`)
            }
            */
            self.playerManager.addOtherPlayers(self, playerInfo, worldLayer, scene);
            
        })

        socket.on('playerMoved', message => {
            self.playerManager.messages.push(message);
        });

        // remove players who leave the scene
        socket.on('playerChangedScene', function (player) {
            self.playerManager.changeScene(self, player, scene);
        })

        // remove players who leave the game
        socket.on('disconnectPlayer', function(playerId, playerName) {
            self.playerManager.deletePlayer(self, playerId, playerName);
            //chat.alertRoom(self, `${playerName} left the game.`)
        })
    
    
    }

    update(time, delta) {
        if (!this.gameActive) { // do not run if game is not active
            return
        }

        if (this.dialogueActive) { // do not run if player is interacting with non-player objects
            return;
        }

        // ------------------------------ PLAYER-SERVER MOVEMENT LOGIC ------------------------------

        if (!this.playerContainer.isColliding) {
            // Listen to the server.
            this.playerManager.processServerMessages(this.playerContainer, this.otherPlayers);

            // Process inputs.
            this.playerManager.processInputs(this);

            // Interpolate other entities.
            this.playerManager.interpolateEntities(this.otherPlayers);

            // Play movement animations
            this.playerManager.playerAnims(this);
        }

        this.playerContainer.isColliding = false;
        // ------------------------------


        if (devMode) {
            this.debugPos.setText(`${this.playerContainer.body.position.x - 11}, ${this.playerContainer.body.position.y - 15}`);
        }

        // SPEED CHANGES ON DIFFERENT TERRAIN
        if (this.terrain === 'hill' && this.playerManager.speed !== this.bikeType.hillSpeed) {
            this.changeTerrain();
            return;
        }
        if (this.terrain === 'dirt' && this.playerManager.speed !== this.bikeType.dirtSpeed) {
            this.changeTerrain();
            return;
        }
        if (this.terrain === 'road' && this.playerManager.speed !== this.bikeType.roadSpeed) {
            this.changeTerrain();
            return;
        }
        this.terrain = 'road'; // reset terrain to road

    }

    // Function that creates collisions etc that can only be created after player is spawned
    afterPlayerSpawn() {

        this.physics.world.setBounds(0, 0, 1600, 1600);
        this.playerContainer.body.setCollideWorldBounds(true);

        //this.gameActive = true;

        let self = this;

        // The score label
        this.scoreText = this.add.text(16, 16, 'score: 0', {
            font: "32px monospace",
            fill: "#ffffff",
            stroke: '#000000',
            strokeThickness: 3
        });
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(100);

        // The player Bike Type label
        this.bikeText = this.add.text(790, 16, '', {
            font: "32px monospace",
            fill: "#ffffff",
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1,0);
        this.bikeText.setScrollFactor(0);
        this.bikeText.setDepth(100);

        // add objects
        this.createCoins();
        this.createHills();
        this.createDirt();
        this.makeOverlay();

    };

    createHills() {
        let self = this;

        this.hills = this.physics.add.group({
            immovable: true
        })

        const hill1 = this.add.container(464, 983)
        hill1.setSize(200, 200);
        this.hills.add(hill1);

        const hill2 = this.add.container(1391, 1420)
        hill2.setSize(100, 100);
        this.hills.add(hill2);

        // Check for overlaps with hills
        this.physics.add.overlap(this.playerContainer, this.hills, function() {
            self.terrain = 'hill';
        })
    }

    createDirt() {
        let self = this;

        this.dirt = this.physics.add.group({
            immovable: true
        })

        const dirt1 = this.add.container(141, 784)
        dirt1.setSize(100, 150);
        this.dirt.add(dirt1);

        const dirt2 = this.add.container(717, 457)
        dirt2.setSize(210, 135);
        this.dirt.add(dirt2);

        const dirt3 = this.add.container(1380, 493)
        dirt3.setSize(320, 250);
        this.dirt.add(dirt3);

        const dirt4 = this.add.container(848, 1147)
        dirt4.setSize(150, 165);
        this.dirt.add(dirt4);

        // Check for overlaps with dirt
        this.physics.add.overlap(this.playerContainer, this.dirt, function() {
            self.terrain = 'dirt';
        })
    }

    changeTerrain() {
        console.log('change terrain')
        if (this.terrain === 'hill') {
            let newSpeed = this.bikeType.hillSpeed;
            this.playerManager.speed = newSpeed;
            socket.emit('changeSpeed', newSpeed);
            return;
        } else if (this.terrain === 'dirt') {
            let newSpeed = this.bikeType.dirtSpeed;
            this.playerManager.speed = newSpeed;
            socket.emit('changeSpeed', newSpeed);
            return;
        } else {
            let newSpeed = this.bikeType.roadSpeed;
            this.playerManager.speed = newSpeed;
            socket.emit('changeSpeed', newSpeed);
        }
    }

    createCoins() {
        let self = this;

        //  Some coins to collect, 15 in total
        this.coins = this.physics.add.group({
            key: 'goldCoin',
            repeat: 14,
        });

        let i = 0;
        this.coins.children.iterate(function (child) {
            //  Give each coin a different position based on map spawnpoints
            let spawnPoint = self.spawnPoints[i];
            child.num = spawnPoint.name;
            child.setPosition(spawnPoint.x, spawnPoint.y);
            i++;
        });

        //  Checks to see if the player overlaps with any of the coins, if he does call the collectCoin function
        this.physics.add.overlap(this.playerContainer, this.coins, this.collectCoin, null, this);
    }

    collectCoin (player, coin) {
        coin.disableBody(true, true);
    
        socket.emit("collectCoin", coin.num);
    
        /*
        if (this.coins.countActive(true) === 0)
        {
            //  A new batch of coins to collect
            this.coins.children.iterate(function (child) {
    
                child.enableBody(true, child.x, 0, true, true);
    
            });
    
        }
        */
    }

    makeOverlay() {
        // load overlay
        this.overlay = this.make.renderTexture({ x: 0, y: 0, width: 1600, height: 1600, });
        this.overlay.setDepth(100)
        this.overlay.fill(0x000000, 0.85);
        this.overlay.setTint(0x0a2948);
    }


    handleGameStart() {
        this.gameActive = true;
        this.overlay.destroy();
    }

    startGame(self) {
        socket.emit('startGame', 'MiniGameBike');
    }

    handleInit(number, player_list) {
        this.playerNumber = number;
        
        this.updatePlayerLobby(player_list);

    }

    handleJoinedGame(newPlayer, player_list) {

        if (newPlayer.name === playerName) {
            return;
        }

        this.updatePlayerLobby(player_list);
        
    }

    handlePlayerLeft(player, player_list) {

        if (player.name === playerName) {
            return;
        }
        this.updatePlayerLobby(player_list);
    }

    updatePlayerLobby(player_list) {
        this.playersInLobby.innerHTML = '';
        for (let p of player_list) {
            let el = document.createElement('tr');
            el.innerText = p.name;
            this.playersInLobby.appendChild(el);
        }
        if (player_list.length > 1) {
            this.startBtn.style.display = 'block'; // show start button
            this.waitingMessage.style.display = 'none';
        } else {
            this.waitingMessage.style.display = 'block';
        }
    }

    handleCountdown(bikes) {
        this.startBtn.style.display = 'none'; // hide start button
        this.initialScreen.style.display = 'none';

        // set player bike type to random bike type from server
        this.bikeType = bikes[this.playerNumber - 1];
        this.bikeText.setText(this.bikeType.name)

        // set initial speed of bike
        let newSpeed = this.bikeType.roadSpeed;
        this.playerManager.speed = newSpeed;
        socket.emit('changeSpeed', newSpeed);

        let self = this;

        // countdown timer
        var timeleft = 5;
        var downloadTimer = setInterval(function(){
          if(timeleft <= 0){
            clearInterval(downloadTimer);
            self.countDown.innerText = '';
          } else {
            self.countDownScreen.style.display = 'block';
            self.countDown.innerText = self.bikeType.name + ' STARTING GAME...' + timeleft;
          }
          timeleft -= 1;
        }, 1000);
    }

    handleScoreUpdate(playerData, coin) {
        if (playerData.name !== this.playerNumber) {

            let removedCoin = this.coins.getMatching('num', coin);
            removedCoin[0].disableBody(true, true);
            return;
        }
        //  Update the score
        this.score = playerData.score
        this.scoreText.setText('Score: ' + this.score);
    }

    handleGameOver(winner, players) {
        if (!this.gameActive) {
            return;
        }

        this.anims.pauseAll();
        this.makeOverlay();
        this.countDownScreen.style.display = 'none';
        this.gameScreen.style.display = 'block';
        this.exitButton2.style.display = 'block';
        this.gameConsole.style.color = 'white';
        this.gameConsole.innerText = 'GAME OVER';

        let coinReward = document.createElement('p');
        coinReward.style.textAlign = 'center';
        coinReward.style.fontSize = '18px';

        let score = 0;
        for (let p of players) {
            if (p.name === this.playerNumber) {
                score = p.score;
            }
        }
    
        if (winner === this.playerNumber) {
            this.gameConsole.innerText = 'YOU WIN!';
            coinReward.innerText = `+${score/10} coins`;
            this.gameConsole.appendChild(coinReward);
        } else {
            this.gameConsole.innerText = `${winner} PLAYER WINS`;
            coinReward.innerText = `+${score/10} coins`;
            this.gameConsole.appendChild(coinReward);
        }

        socket.emit("leaveMiniGame");
        socket.emit("updateCoins", score);

        this.resetGame();

    }

    resetGame() {
        this.playerNumber = null;
        this.gameActive = false;
    }

    exitGame() {
        // change scene
        socket.off();

        let scenes = {
            old: 'MiniGameSnake',
            new: 'SceneMainBuildingBasement'
        }
        this.scene.start(scenes.new, this);
        this.anims.resumeAll();
        socket.emit('changeSpeed', this.bikeType.roadSpeed);
        socket.emit("sceneChange", scenes);
        socket.emit("leaveMiniGame");
    }

}