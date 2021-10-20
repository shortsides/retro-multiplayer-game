import { devMode, SPRITES } from "../../index.js";
import { socket } from "../../index.js";
import { playerSprite } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Cursors from "../cursors.js";
import ChatManager from "../chat_manager.js";
import NPC from "../NPC.js";
import { berryTreeConfig } from "../NPC_char.js";

export default class DarkForest extends Phaser.Scene {

    constructor() {
        super('SceneDarkForest');
    }

    init() {
        this.gameActive = false;
        this.stoppedLog = true;
        this.otherPlayers;
        this.dialogueActive = false;
        this.allowedActions = {
            move: true,
            attack: true,
        }
    }

    preload() {

    }

    create() {

        const scene = 'SceneDarkForest';

        let self = this;
    
        const map = this.make.tilemap({ key: "map-dark-forest" });
    
        // Load tileset
        const tileset = map.addTilesetImage("atlas_32x", "tiles-world");
    
        // Create layers
        const floorLayer = map.createLayer("Floor", tileset, 0, 0);
        const worldLayer = map.createLayer("World", tileset, 0, 0);
        const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);
    
        worldLayer.setCollisionByProperty({ collides: true });
        aboveLayer.setDepth(10);

        // Create mask for 'fog of war' effect
        this.fog = this.make.renderTexture({ x: 0, y: 0, width: 992, height: 992, });
        this.fog.fill(0x000000);
        this.fog.setTint(0x0a2948);
        this.fog.draw(floorLayer);
        this.fog.draw(worldLayer);
        this.fog.draw(aboveLayer);
        this.fog.setDepth(15);

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
            if (playerState.playerId === socket.id) {
                // slight delay to compensate for lag
                setTimeout(function(){ 
                    self.playerManager.handleDamage(self, playerState);
                }, 500);
            } else {
                self.playerManager.handleDamage(self, playerState);
            }
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


        // update player vision mask
        if (this.vision)
        {
            this.vision.x = this.playerContainer.body.position.x + 11;
            this.vision.y = this.playerContainer.body.position.y + 15;
        }

        // devmode debug x/y coords
        if (devMode) {
            this.debugPos.setText(`${this.playerContainer.body.position.x - 11}, ${this.playerContainer.body.position.y - 15}`);
        }

        // check if player has left dark forest
        if (this.playerContainer.body.position.x < 5 && this.playerContainer.body.position.y < 460) {

            // pause player position
            this.playerContainer.body.velocity.x = 0;
            this.playerContainer.body.velocity.y = 0;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let scenes = {
                old: 'SceneDarkForest',
                new: 'SceneWorld'
            }

            this.scene.start(scenes.new, this);
            this.anims.resumeAll();
            socket.emit("sceneChange", scenes);

        }
        // check if player has gone into forest hut
        if (this.playerContainer.body.position.y < 212) {

            // pause player position
            this.playerContainer.body.velocity.x = 0;
            this.playerContainer.body.velocity.y = 0;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let scenes = {
                new: 'SceneForestHut'
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

        this.unpauseAfterAttacks();

        // create player vision mask on fog
        this.vision = this.make.image({
            x: this.player.body.position.x,
            y: this.player.body.position.y,
            key: 'circle-mask',
            add: false
        });
        this.vision.scale = 0.5;

        this.fog.mask = new Phaser.Display.Masks.BitmapMask(this, this.vision);
        this.fog.mask.invertAlpha = true;

        this.spawnBerryTree();

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

    checkSwordEquipped(isEquipped) {
        if (isEquipped) {
            this.allowedActions.attack = true;
        } else {
            this.allowedActions.attack = false;
        }
    }

    spawnBerryTree() {

        let self = this;

        // Create berry tree NPC
        this.berryTree = new NPC(this, berryTreeConfig);
        
        // Create NPC dialogue UI
        this.berryTree.createDialogueUI();

        // Create collision box
        this.berryTreeContainer = this.add.container(this.berryTree.x, this.berryTree.y);
        this.berryTreeContainer.setSize(82, 92);
        this.physics.world.enable(this.berryTreeContainer);
        this.berryTreeContainer.body.setImmovable();
        this.berryTreeCollider = this.physics.add.collider(this.playerContainer, this.berryTreeContainer);

        // Create interaction box
        this.berryTreeInteractionBox = this.add.container(this.berryTree.x, this.berryTree.y);
        this.berryTreeInteractionBox.setSize(100, 110);
        this.physics.world.enable(this.berryTreeInteractionBox);

        // listen for player collisions with berry tree container
        self.physics.add.overlap(self.berryTreeInteractionBox, self.playerContainer, function() {
            
            // interact with berry tree NPC on 'space'
            self.cursors.space.on("down", () => {

                if (self.dialogueActive) {
                    return;
                }

                if (!self.berryTreeInteractionBox.body.embedded && self.berryTreeInteractionBox.body.touching.none) {
                    return;
                }

                
                self.player.anims.stop();
                self.berryTree.play('berry_tree_shake', true);

                self.berryTree.on(`animationcomplete-berry_tree_shake`, function () {
                    if (self.dialogueActive) {
                        return;
                    }
                    self.dialogueActive = true;
                    self.berryTree.readDialogue("hello");

                    // Give player a berry
                    let berry = {
                        name: 'blue berry',
                        spritePath: '../../assets/sprites/blue_berry.png',
                        info: 'Blue berry',
                    }
                    
                    self.inventory.addItem(berry);
                });

            });

        });

    }

}