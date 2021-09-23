import { SPRITES } from "../../index.js";
import { socket } from "../../index.js";
import { playerSprite } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Anims from "../anim_manager.js";
import Cursors from "../cursors.js";
import PlayerActions from "../player_actions.js";
import ChatManager from "../chat_manager.js";
import NPC from "../NPC.js";

export default class SceneMainBuildingBasement extends Phaser.Scene {

    constructor() {
        super('SceneMainBuildingBasement');
    }

    init() {
        this.gameActive = false;
        this.stoppedLog = true;
        this.otherPlayers;
        this.dialogueActive = false;
    }

    preload() {
        
    }

    create() {

        const scene = 'SceneMainBuildingBasement';

        let self = this;    
    
        // Load tileset
        const map = this.make.tilemap({ key: "map-main-basement" });
        const tileset = map.addTilesetImage("interior_atlas", "tiles", 32, 32, 1, 2);
    
        // Create layers
        const floorLayer = map.createLayer("Floor", tileset, 0, 0);
        const belowLayer = map.createLayer("Below Player", tileset, 0, 0);
        const worldLayer = map.createLayer("World", tileset, 0, 0);
        const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);
    
        worldLayer.setCollisionByProperty({ collides: true });
        aboveLayer.setDepth(10);

        // Create cursor keys
        const cursors = new Cursors(this);

        // Debug graphics
        cursors.debugGraphics(this, worldLayer);

        // Create chat window
        this.chat = this.add.dom(16, 16).createFromCache("chat")
            .setScrollFactor(0)
            .setDepth(30)
        
        let chat = new ChatManager(this);
        
        // Reload messages from previous scene into chat
        let messages = this.registry.get('chatMessages')
        chat.reloadMessages(this, messages);
        this.registry.set('chatMessages', chat.chatMessages);
        
        // Create player manager in scene
        this.playerManager = new PlayerManager(this);

        // Turn off camera initially until player info is loaded from server
        this.cameras.main.visible = false;
    
        // When this player joins, spawn all current players in room
        socket.on('currentPlayers', function (players) {
            self.otherPlayers = self.physics.add.group();
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId === socket.id) {
                    self.playerManager.addPlayer(self, players[id], worldLayer, map);
                    document.getElementById('chatBox').style.display = 'block';

                    self.afterPlayerSpawn();

                } else {
                    self.playerManager.addOtherPlayers(self, players[id], worldLayer, scene);
                }
            });
        });
        
        // When a new player joins, spawn them
        socket.on('newPlayer', function (playerInfo) {
            if (playerInfo.scene !== scene || playerInfo.playerId === socket.id) {
                return;
            }
            if (playerInfo.init === true) {
                console.log(`${playerInfo.name} joined the game`);
                chat.alertRoom(self, `${playerInfo.name} joined the game.`)
            }
            self.playerManager.addOtherPlayers(self, playerInfo, worldLayer, scene);
            
        })
    
        // Handle other player movements
        socket.on('playerMoved', function(playerInfo) {
            self.playerManager.moveOtherPlayers(self, playerInfo, scene)
        })

        // remove players who leave the scene
        socket.on('playerChangedScene', function (player) {
            self.playerManager.changeScene(self, player, scene);
        })

        // remove players who leave the game
        socket.on('disconnectPlayer', function(playerId, playerName) {
            self.playerManager.deletePlayer(self, playerId, playerName);
            chat.alertRoom(self, `${playerName} left the game.`)
        })


        // interacting with snake table
        this.snakeTable = this.add.container(288, 542);
        this.snakeTable.setSize(60, 60);
        this.physics.world.enable(this.snakeTable);

        this.snakeTable.setInteractive();

        this.snakeTable.on('pointerdown', function (pointer) {

            console.log('click');

            // pause player position
            self.playerContainer.body.moves = false;
            //self.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let miniGameName = 'MiniGameSnake';
            self.scene.start(miniGameName, self);
            self.anims.resumeAll();
            socket.emit("startMiniGame", miniGameName);
            
        })
        
    
    }

    update(time, delta) {

        if (!this.gameActive) { // do not run if game is not active
            return;
        }

        if (this.dialogueActive) { // do not run if player is interacting with non-player objects
            return;
        }

        const playerActions = new PlayerActions(this);
        playerActions.movePlayer(this);
        
        // check if player has left basement
        if (405 > this.playerContainer.body.position.x < 415 && this.playerContainer.body.position.y < 360) {

            // pause player position
            this.playerContainer.body.moves = false;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let scenes = {
                old: 'SceneMainBuildingBasement',
                new: 'SceneMainBuilding'
            }
            this.scene.start(scenes.new, this);
            this.anims.resumeAll();
            socket.emit("sceneChange", scenes);

        }
    
    }

    // Function that creates collisions etc that can only be created after player is spawned
    afterPlayerSpawn() {

        this.gameActive = true;

        let self = this;
        
    }

}