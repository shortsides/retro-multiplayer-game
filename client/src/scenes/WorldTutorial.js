import { devMode, SPRITES } from "../../index.js";
import { socket } from "../../index.js";
import { playerSprite } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Cursors from "../cursors.js";
import ChatManager from "../chat_manager.js";
import NPC from "../NPC.js";
import { pilotConfig, propellerConfig } from "../NPC_char.js";

export default class SceneWorldTutorial extends Phaser.Scene {

    constructor() {
        super('SceneWorldTutorial');
    }

    init() {
        this.gameActive = false;
        this.stoppedLog = true;
        this.otherPlayers;
        this.dialogueActive = false;
        this.allowedActions = {
            move: true,
            attack: false, // false until sword is equipped
        }
    }

    preload() {

    }

    create() {

        const scene = 'SceneWorldTutorial';

        let self = this;
    
        const map = this.make.tilemap({ key: "map-world" });
    
        // Load tileset
        const tileset = map.addTilesetImage("atlas_32x", "tiles-world");
    
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
                    self.afterPlayerSpawn(players[id].objects);
                    self.checkSwordEquipped(players[id].swordEquipped);
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
            if (playerInfo.init === true) {
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

        socket.on('playerDamaged', playerState => {
            self.playerManager.handleDamage(self, playerState);
        })

        socket.on('swordEquipped', isEquipped => {
            self.checkSwordEquipped(isEquipped);
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

        // check if player has gone into main building
        if (this.playerContainer.body.position.x > 1140 && this.playerContainer.body.position.y < 600) {

            // pause player position
            this.playerContainer.body.velocity.x = 0;
            this.playerContainer.body.velocity.y = 0;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let scenes = {
                new: 'SceneMainBuilding'
            }

            this.scene.start(scenes.new, this);
            this.anims.resumeAll();
            socket.emit("sceneChange", scenes);

        }
    
    }
    
    // Function that creates collisions etc that can only be created after player is spawned
    afterPlayerSpawn(sceneObjects) {

        this.gameActive = true;

        let self = this;

        // display chat and buttons
        document.getElementById('chatBox').style.display = 'block';
        document.getElementById('inventory_button').style.display = 'block';

        this.unpauseAfterAttacks();

        // check if propeller should be spawned
        if (sceneObjects.length === 0) {
            this.spawnPropeller();
            this.spawnPlane();
            this.spawnPilot();
        } else {
            for (let obj of sceneObjects) {
                if (obj.name === 'propeller' && obj.visible === false) {
                    continue;
                } else {
                    this.spawnPropeller();
                }
    
            }
            this.spawnPlane();
            this.spawnPilot();
        }

    }

    unpauseAfterAttacks() {
        let self = this;

        // Unpause player actions after action completes e.g. after attacking
        this.player.on('animationcomplete', function (anim, frame) {
            this.emit('animationcomplete_' + anim.key, anim, frame);
        }, this.player);

        this.player.on(`animationcomplete_${playerSprite.spriteSheet}-left-sword`, function () {
            self.playerManager.allowSendInputs = true;
            self.playerManager.currentAction = null;
            self.allowedActions.move = true;
            self.allowedActions.attack = true;
        });

        this.player.on(`animationcomplete_${playerSprite.spriteSheet}-right-sword`, function () {
            self.playerManager.allowSendInputs = true;
            self.playerManager.currentAction = null;
            self.allowedActions.move = true;
            self.allowedActions.attack = true;
        });

        this.player.on(`animationcomplete_${playerSprite.spriteSheet}-back-sword`, function () {
            self.playerManager.allowSendInputs = true;
            self.playerManager.currentAction = null;
            self.allowedActions.move = true;
            self.allowedActions.attack = true;
        });

        this.player.on(`animationcomplete_${playerSprite.spriteSheet}-front-sword`, function () {
            self.playerManager.allowSendInputs = true;
            self.playerManager.currentAction = null;
            self.allowedActions.move = true;
            self.allowedActions.attack = true;
        });
    }

    spawnPropeller(){
        let self = this;

        // Create propeller NPC
        this.propeller = new NPC(this, propellerConfig);
        this.propeller.createDialogueUI();
        this.propellerCollider = this.physics.add.collider(this.playerContainer, this.propeller);

        // Create propeller collision box
        this.propellerContainer = this.add.container(this.propeller.x, this.propeller.y);
        this.propellerContainer.setSize(50, 50);
        this.physics.world.enable(this.propellerContainer);

        // create player collisions with propeller container
        this.propellerOverlap = this.physics.add.overlap(this.propellerContainer, this.playerContainer, function() {

            self.cursors.space.on("down", () => {

                if (!self.propellerContainer.body.embedded && self.propellerContainer.body.touching.none) {
                    return;
                }
                
                if (self.dialogueActive === false) {
                    self.dialogueActive = true;
                    self.propeller.readDialogue("hello");
                    self.player.anims.stop();
                    return;
                }
                
            });
        });
    }

    spawnPlane() {
        // Create plane
        this.planeSprite = this.physics.add.sprite(890, 615, 'plane');
        this.planeSprite.setImmovable();
        this.planeSprite.setDepth(60);

        // create player collisions with plane
        this.physics.add.collider(this.playerContainer, this.planeSprite);
    }

    spawnPilot() {
        let self = this;
        
        // Create pilot NPC
        this.pilot = new NPC(this, pilotConfig);
        this.pilot.setScale(2);
        this.pilot.createDialogueUI();
        this.pilotCollider = this.physics.add.collider(this.playerContainer, this.pilot);

        // Create pilot interaction container
        this.pilotContainer = this.add.container(this.pilot.x, this.pilot.y);
        this.pilotContainer.setSize(50, 40);
        this.physics.world.enable(this.pilotContainer);
        this.pilotOverlap = this.physics.add.overlap(this.playerContainer, this.pilotContainer, function() {

            this.pilotSpaceKey = self.cursors.space.on("down", () => {

                if (!self.pilotContainer.body.embedded && self.pilotContainer.body.touching.none) {
                    return;
                }

                let hasPropeller = self.inventory.checkItem('propeller');
                
                if (self.dialogueActive === false) {
                    self.dialogueActive = true;
                    self.player.anims.stop();
                    if (hasPropeller !== false) {
                        self.pilot.readDialogue("foundPropeller");
                    } else {
                        self.pilot.readDialogue("hello");
                    }
                    return;
                }

            });
        });
    }

    sceneCallbacks(callback) {
        let self = this;
        setTimeout(function () {
            self.dialogueActive = false;
        }, 200);

        if (callback === 'removePropeller') {
            this.removePropeller();
        }
        if (callback === 'planeFlyAway') {
            this.planeFlyAway();
        }
    }

    removePropeller() {
        console.log('removed propeller from World')
        this.propeller.destroy();
        this.physics.world.removeCollider(this.propellerOverlap);
        this.physics.world.removeCollider(this.propellerCollider);
        this.propellerContainer.destroy();

        // tell server to keep object out of scene
        socket.emit('objRemovedFromScene', 'propeller');
    }

    planeFlyAway() {
        
        let self = this;

        socket.emit('endTutorial');

        // pause player position
        this.playerContainer.body.moves = false;

        // stop player from being able to interact with pilot
        this.input.keyboard.enabled = false;

        // make pilot turn to face plane then disappear
        this.pilot.setTexture('sprites1', 28)
        setTimeout(function () {
            self.pilot.destroy();
            self.physics.world.removeCollider(self.pilotOverlap);
            self.physics.world.removeCollider(self.pilotCollider);
            self.pilotContainer.destroy();
        }, 800);

        // put propeller sprite on plane and rotate it
        let propeller = this.physics.add.sprite(890, 660, 'propeller');
        propeller.setDepth(60);

        let angle = 0;
        const interval = setInterval(function() {
            propeller.setAngle(angle);
            if (angle >= 360) {
                angle = 0;
            }
            angle++
        }, 2);

        // give plane a y velocity to fly down the screen
        setTimeout(function () {
            self.planeSprite.setVelocity(0, 170);
            propeller.setVelocity(0, 170);

            setTimeout(function () {
                self.cameras.main.fadeOut(2000);

                // change scene
                socket.off();

                let scenes = {
                    old: 'SceneWorldTutorial',
                    new: 'SceneWorld'
                }

                self.scene.start(scenes.new, self);
                self.anims.resumeAll();
                socket.emit("sceneChange", scenes);
            }, 2500);

        }, 800);
    }

    checkSwordEquipped(isEquipped) {
        if (isEquipped) {
            this.allowedActions.attack = true;
        } else {
            this.allowedActions.attack = false;
        }
    }

}