import { devMode, SPRITES } from "../../index.js";
import { socket } from "../../index.js";
import { playerSprite } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Cursors from "../cursors.js";
import ChatManager from "../chat_manager.js";
import NPC from "../NPC.js";
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
        this.allowedActions = {
            move: true,
            attack: false,
        }
        this.tutorial = false;
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

        socket.on('playerDamaged', playerState => {
            self.playerManager.handleDamage(self, playerState);
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
        

        // Create innkeeper NPC
        this.innkeeper = new NPC(this, innkeeperConfig);
        this.innkeeper.setScale(2);

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

        // check if player has left main building
        if (this.playerContainer.body.position.y > 640) {

            // pause player position
            this.playerContainer.body.moves = false;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            // check if player is still in tutorial or not
            let scenes;
            if (this.tutorial) {
                scenes = {
                    new: 'SceneWorldTutorial'
                }
            } else {
                scenes = {
                    new: 'SceneWorld'
                }
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
                self.playerManager.direction = 'right';
                
            });

        });


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


        /*
        // TEST NPC FIGHTING ANIMS
        let enemyContainer = this.add.container(500, 540)
        enemyContainer.setSize(24, 34);
        this.physics.world.enable(enemyContainer);
        enemyContainer.body.debugBodyColor = 0xadfefe;
        enemyContainer.body.setImmovable(true);
        this.physics.add.collider(this.playerContainer, enemyContainer);

        let enemy = this.physics.add.sprite(0, 0, 'midora-sword-short', 0);
        enemy.id = 1;

        let enemyHitBox = this.add.rectangle(500 - 22, 540, 40, 60);
        this.physics.world.enable(enemyHitBox);
        enemyHitBox.body.setImmovable(true);
        enemyHitBox.body.debugBodyColor = 0xb21d0a;

        enemyContainer.add(enemy, enemyHitBox);
        
        this.cursors.w.on("down", () => {
            enemy.play('midora-sword-attack-short'); // play attack anim
            
        })
        
        let attackData = {}
        let attackLogged = false;

        enemy.on('attack', function (attackData) {
            
            // display damage as red tint on sprite
            if (attackData.victimId === socket.id) {

                self.tweens.addCounter({
                    from: 0,
                    to: 3,
                    duration: 400,
                    onUpdate: function (t) {
                        let value = t.getValue();

                        if (value < 1) {
                            self.player.setTint(0xff2b2b, 0xff2b2b, 0xff2b2b, 0xff2b2b)
                        }
                        else if (value < 2 && value >= 1) {
                            self.player.clearTint()
                        } else {
                            self.player.setTint(0xff2b2b, 0xff2b2b, 0xff2b2b, 0xff2b2b)
                        }
                    },
                    onComplete: function() {
                        self.player.clearTint()
                    }
                });

            }

            // emit attack to server to validate attack
            socket.emit('attack', attackData);
        })
        
        this.physics.add.overlap(self.playerContainer, enemyHitBox, function() {

            // display health bar
            document.getElementById(`health_bar_${socket.id}`).style.display = 'block';

            if (enemy.anims.getName() === 'midora-sword-attack-short') {
                let attackFrame = enemy.anims.currentFrame.index;
                if (attackFrame >= 5 && attackFrame < 7) {

                    attackData = {
                        attackerId: enemy.id,
                        victimId: socket.id,
                        damage: 5,
                        attackType: 'sword'
                    }
                    
                    if (!attackLogged) {
                        enemy.emit('attack', attackData);
                    }
                    attackLogged = true;
                }
                if (attackFrame >= 7) {
                    attackLogged = false;
                }
            }
            
        })
        */

    }

}