import { SPRITES } from "../../index.js";
import { socket } from "../../index.js";
import { playerSprite } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Anims from "../anim_manager.js";
import Cursors from "../cursors.js";
import PlayerActions from "../player_actions.js";
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
        //cursors.debugGraphics(this, worldLayer);

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

                    // listen for player collisions with inkeeper container
                    self.physics.add.overlap(self.innKeeperContainer, self.playerContainer, function() {

                        let keySpace = self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
                        keySpace.on("down", () => {

                            if (!self.innKeeperContainer.body.embedded && self.innKeeperContainer.body.touching.none) {
                                return;
                            }
                            
                            if (self.dialogueActive === false) {
                                self.dialogueActive = true;
                                self.innkeeper.setTexture(SPRITES[0].spriteSheet, 20) // face the player
                                self.innkeeper.readDialogue("hello");
                                self.player.anims.stop();
                                self.player.setTexture(playerSprite.spriteSheet, playerSprite.right);
                                return;
                            }
                            
                        });
                    });

                } else {
                    self.playerManager.addOtherPlayers(self, players[id], worldLayer, scene);
                }
            });
            self.gameActive = true;
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
        socket.on('disconnectPlayer', function(player) {
            self.playerManager.deletePlayer(self, player);
            chat.alertRoom(self, `${player.name} left the game.`)
        })
        

        // Create innkeeper NPC
        this.innkeeper = new NPC(this, innkeeperConfig);

        // Create NPC dialogue UI
        this.innkeeper.createDialogueUI();

        // Create inkeeper collision box
        this.innKeeperContainer = this.add.container(550, 470)
        this.innKeeperContainer.setSize(80, 40)
        this.physics.world.enable(this.innKeeperContainer);
        
    
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
        
        // check if player has left main building
        if (this.playerContainer.body.position.y > 640) {

            let self = this;

            // pause player position
            this.playerContainer.body.moves = false;
            this.cameras.main.fadeOut(2000);

            // change scene
            socket.off();

            let newScene = 'SceneWorld';
            self.scene.start(newScene, self);
            self.anims.resumeAll();
            socket.emit("sceneChange", newScene);


        }
    
    }

}