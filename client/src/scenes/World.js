import { SPRITES } from "../../index.js";
import { socket } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Cursors from "../cursors.js";
import PlayerActions from "../player_actions.js";
import ChatManager from "../chat_manager.js";
import NPC from "../NPC.js";
import InventoryManager from "../Inventory.js";
import { propellerConfig } from "../NPC_char.js";

export default class SceneWorld extends Phaser.Scene {

    constructor() {
        super('SceneWorld');
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

        const scene = 'SceneWorld';

        let self = this;
    
        const map = this.make.tilemap({ key: "map-world" });
    
        // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
        // Phaser's cache (i.e. the name you used in preload)
        const tileset = map.addTilesetImage("atlas_32x", "tiles-world");
    
        // Parameters: layer name (or index) from Tiled, tileset, x, y
        const floorLayer = map.createLayer("Floor", tileset, 0, 0);
        const belowLayer = map.createLayer("Below Player", tileset, 0, 0);
        const worldLayer = map.createLayer("World", tileset, 0, 0);
        const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);
    
        worldLayer.setCollisionByProperty({ collides: true });
        aboveLayer.setDepth(10);

        // Create cursor keys
        const cursors = new Cursors(this);

        // Debug graphics
        //cursors.debugGraphics(this, worldLayer);

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
        this.playerManager = new PlayerManager(this);
        
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
                    self.playerManager.addOtherPlayers(self, players[id], worldLayer, scene);
                }
            });
        });
        
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
    
        // Handle other player movements
        socket.on('playerMoved', function(playerInfo, ticker) {
            self.playerManager.moveOtherPlayers(self, playerInfo, ticker, scene)
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

        // Create propeller NPC
        this.propeller = new NPC(this, propellerConfig);

        // Create NPC dialogue UI
        this.propeller.createDialogueUI();

        // Create plane and propeller sprites
        this.planeSprite = this.physics.add.sprite(890, 615, 'plane').setImmovable();
        this.propellerSprite = this.physics.add.sprite(780, 943, 'propeller');

        // Create propeller collision box
        this.propellerContainer = this.add.container(this.propeller.x, this.propeller.y);
        this.propellerContainer.setSize(this.propeller.width, this.propeller.height);
        this.physics.world.enable(this.propellerContainer);
        
    
    }

    update(time, delta) {

        if (!this.gameActive) {
            return
        }

        const playerActions = new PlayerActions(this);
        playerActions.movePlayer(this);
        this.playerContainer.isColliding = false;


        // check if player has gone into main building
        if (this.playerContainer.body.position.x > 1150 && this.playerContainer.body.position.y < 590) {

            // pause player position
            this.playerContainer.body.moves = false;
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
    afterPlayerSpawn() {

        this.gameActive = true;

        let self = this;

        // display chat and buttons
        document.getElementById('chatBox').style.display = 'block';
        document.getElementById('inventory_button').style.display = 'block';

        // create player collisions with propeller container
        this.physics.add.overlap(this.propellerContainer, this.playerContainer, function() {

            let keySpace = self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            keySpace.on("down", () => {

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

        // create player collisions with plane
        this.physics.add.collider(this.playerContainer, this.planeSprite);
    }

}