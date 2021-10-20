import { devMode, SPRITES } from "../../index.js";
import { socket } from "../../index.js";
import { playerSprite } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Cursors from "../cursors.js";
import ChatManager from "../chat_manager.js";
import NPC from "../NPC.js";
import { forestHermitConfig } from "../NPC_char.js";

export default class forestHut extends Phaser.Scene {

    constructor() {
        super('SceneForestHut');
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
    }

    preload() {
        
    }

    create() {

        const scene = 'SceneForestHut';

        let self = this;    
    
        // Load tileset
        const map = this.make.tilemap({ key: "map-forest-hut" });
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
        this.add.sprite(466, 475, 'fire').setScale(1.5).play('fire_anim');

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
    
        

        async function spawnThisPlayer (players) {
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId === socket.id) {
                    self.playerManager.addPlayer(self, players[id], worldLayer, map);
                    self.afterPlayerSpawn();
                    if (players[id].tutorial) {
                        self.tutorial = true;
                    }
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
            if (playerInfo.scene !== scene || playerInfo.playerId === socket.id) {
                return;
            }
            if (playerInfo.init === true) {
                console.log(`${playerInfo.name} joined the game`);
                chat.alertRoom(self, `${playerInfo.name} joined the game.`)
            }
            self.playerManager.addOtherPlayers(self, playerInfo, worldLayer, scene);
            console.log(`spawned new player in ${scene}`);
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
    
    }

    update(time, delta) {

        if (!this.gameActive) { // do not run if game is not active
            return;
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

        // check if player has left the hut
        if (this.playerContainer.body.position.y > 570) {

            // pause player position
            this.playerContainer.body.velocity.x = 0;
            this.playerContainer.body.velocity.y = 0;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let scenes = {
                old: 'SceneForestHut',
                new: 'SceneDarkForest'
            }
            
            this.scene.start(scenes.new, this);
            this.anims.resumeAll();
            socket.emit("sceneChange", scenes);

        }
    
    }

    // Function that creates collisions etc that can only be created after player is spawned
    afterPlayerSpawn() {

        this.gameActive = true;

        // display chat and buttons
        document.getElementById('chatBox').style.display = 'block';
        document.getElementById('inventory_button').style.display = 'block';
    
        this.spawnForestHermit();

    }

    spawnForestHermit() {

        let self = this;

        // Create forest hermit NPC
        this.forestHermit = new NPC(this, forestHermitConfig);
        this.forestHermit.setScale(2);
        
        // Create NPC dialogue UI
        this.forestHermit.createDialogueUI();

        // Create forest hermit collision box
        this.forestHermitContainer = this.add.container(this.forestHermit.x, this.forestHermit.y);
        this.forestHermitContainer.setSize(22, 30);
        this.physics.world.enable(this.forestHermitContainer);
        this.forestHermitContainer.body.setImmovable();
        this.forestHermitCollider = this.physics.add.collider(this.playerContainer, this.forestHermitContainer);

        // Create forest hermit interaction box
        this.forestHermitInteractionBox = this.add.container(this.forestHermit.x, this.forestHermit.y);
        this.forestHermitInteractionBox.setSize(45, 45);
        this.physics.world.enable(this.forestHermitInteractionBox);

        // listen for player collisions with forest hermit container
        self.physics.add.overlap(self.forestHermitInteractionBox, self.playerContainer, function() {
            
            // interact with forest hermit NPC on 'space'
            self.cursors.space.on("down", () => {

                if (self.dialogueActive) {
                    return;
                }

                if (!self.forestHermitInteractionBox.body.embedded && self.forestHermitInteractionBox.body.touching.none) {
                    return;
                }

                self.dialogueActive = true;
                self.player.anims.stop();
                self.forestHermit.facePlayer(self.playerManager.direction);

                let questState = false;

                for (let q of self.questLog.quests) {
                    if (q.id === 1) {
                        questState = q;

                        if (q.completed) {
                            self.forestHermit.readDialogue("questCompleted");
                            return;
                        }
                    }
                }
                if (questState === false) {
                    self.forestHermit.readDialogue("hello");
                } else {

                    let numBerries = self.inventory.checkNumItems('blue berry');

                    if (numBerries >= 5) {
                        self.forestHermit.readDialogue("foundBerries");
                        socket.emit("endQuest", questState);
                    } else {
                        self.forestHermit.readDialogue("questProgressCheck");
                    }
                }
                
            });

        });

    }

}