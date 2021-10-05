import { devMode, lag_ms, SPRITES } from "../../index.js";
import { socket } from "../../index.js";
import { playerSprite } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Anims from "../anim_manager.js";
import Cursors from "../cursors.js";
import ChatManager from "../chat_manager.js";
import NPC from "../NPC.js";
import InventoryManager from "../Inventory.js";
import { innkeeperConfig } from "../NPC_char.js";

export default class SceneMainBuilding extends Phaser.Scene {

    constructor() {
        super('SceneMainBuilding');
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

        const scene = 'SceneMainBuilding';

        let self = this;    
    
        // Load tileset
        const map = this.make.tilemap({ key: "map" });
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
        if (devMode) {
            cursors.debugGraphics(this, worldLayer);
        }

        // Add fire animations
        this.add.sprite(688, 534, 'fire2').setScale(1.5).play('fire_anim2');
        this.add.sprite(560, 290, 'fire').setScale(1).play('fire_anim');

        // Create chat window
        this.chat = this.add.dom(16, 16).createFromCache("chat")
            .setScrollFactor(0)
            .setDepth(30)
        
        let chat = new ChatManager(this);
        
        // Reload messages from previous scene into chat
        let messages = this.registry.get('chatMessages')
        chat.reloadMessages(this, messages);
        this.registry.set('chatMessages', chat.chatMessages);

        // Create inventory UI
        this.inventoryUI = this.add.dom(616, 16).createFromCache("inventory")
            .setScrollFactor(0)
            .setDepth(30)
        
        // Create player manager in scene
        this.playerManager = new PlayerManager(scene);

        // Turn off camera initially until player info is loaded from server
        this.cameras.main.visible = false;
    
        // When this player joins, spawn all current players in room
        socket.on('currentPlayers', function (players) {
            self.otherPlayers = self.physics.add.group();
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId === socket.id) {
                    self.playerManager.addPlayer(self, players[id], worldLayer, map);

                    self.afterPlayerSpawn();

                } else {
                    self.playerManager.addOtherPlayers(self, players[id], worldLayer);
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
        
        /*
        // Handle other player movements
        socket.on('otherPlayerMoved', function(playerInfo, ticker) {
            self.playerManager.moveOtherPlayers(self, playerInfo, ticker, scene)
        })
        */

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
            chat.alertRoom(self, `${playerName} left the game.`)
        })
        

        // Create innkeeper NPC
        this.innkeeper = new NPC(this, innkeeperConfig);

        // Create NPC dialogue UI
        this.innkeeper.createDialogueUI();

        // Create inkeeper collision box
        this.innKeeperContainer = this.add.container(550, 470);
        this.innKeeperContainer.setSize(80, 40);
        this.physics.world.enable(this.innKeeperContainer);
        
    
    }

    update(time, delta) {

        if (!this.gameActive) { // do not run if game is not active
            return;
        }

        if (this.dialogueActive) { // do not run if player is interacting with non-player objects
            return;
        }

        // ------------------------------ NEW PLAYER-SERVER MOVEMENT LOGIC ------------------------------
        const prevVelocity = this.playerContainer.body.velocity.clone();

        if (!this.playerContainer.isColliding) {
            // Listen to the server.
            this.playerManager.processServerMessages(this.playerContainer, this.otherPlayers);

            // Process inputs.
            this.playerManager.processInputs(this);

            // Interpolate other entities.
            this.playerManager.interpolateEntities(this.otherPlayers);

            // Play movement animations
            this.playerManager.playWalkingAnims(this, prevVelocity);
        }

        this.playerContainer.isColliding = false;
        // ------------------------------

        if (devMode) {
            this.debugPos.setText(`${this.playerContainer.body.position.x - 11}, ${this.playerContainer.body.position.y - 15}`);
        }

        // check if player has left main building
        if (this.playerContainer.body.position.y > 640) {

            // pause player position
            this.playerContainer.body.moves = false;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let scenes = {
                new: 'SceneWorld'
            }

            this.scene.start(scenes.new, this);
            this.anims.resumeAll();
            socket.emit("sceneChange", scenes);

        }
        // check if player has gone into basement
        if (this.playerContainer.body.position.x < 435 && this.playerContainer.body.position.y < 383) {

            // pause player position
            this.playerContainer.body.velocity.x = 0;
            this.playerContainer.body.velocity.y = 0;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let scenes = {
                new: 'SceneMainBuildingBasement'
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

        // display chat and buttons
        document.getElementById('chatBox').style.display = 'block';
        document.getElementById('inventory_button').style.display = 'block';
        
        // listen for player collisions with inkeeper container
        self.physics.add.overlap(self.innKeeperContainer, self.playerContainer, function() {
            
            // interact with inkeeper NPC on 'space'
            self.cursors.space.on("down", () => {

                if (self.dialogueActive) {
                    return;
                }

                if (!self.innKeeperContainer.body.embedded && self.innKeeperContainer.body.touching.none) {
                    return;
                }
                
                self.dialogueActive = true;
                self.innkeeper.setTexture(SPRITES[0].spriteSheet, 20) // face the player
                self.innkeeper.readDialogue("hello");
                self.player.anims.stop();
                self.player.setTexture(playerSprite.spriteSheet, playerSprite.right);
                
            });

        });
    }

}