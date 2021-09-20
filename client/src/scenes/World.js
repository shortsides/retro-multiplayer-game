import { SPRITES } from "../../index.js";
import { socket } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Cursors from "../cursors.js";
import PlayerActions from "../player_actions.js";
import ChatManager from "../chat_manager.js";

export default class SceneWorld extends Phaser.Scene {

    constructor() {
        super('SceneWorld');
    }

    init() {
        this.gameActive = false;
        this.stoppedLog = true;
        this.otherPlayers;
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

        // Create chat window
        this.chat = this.add.dom(16, 16).createFromCache("chat")
            .setScrollFactor(0)
            .setDepth(30)

        let chat = new ChatManager(this);

        // Reload messages from previous scene into chat
        let messages = this.registry.get('chatMessages')
        chat.reloadMessages(this, messages);
        this.registry.set('chatMessages', chat.chatMessages);
        
        // Create player in scene
        this.playerManager = new PlayerManager(this);
        
        // Turn off camera initially until player info is loaded from server
        this.cameras.main.visible = false;

        // When this player joins, spawn all current players in room
        socket.on('currentPlayers', function (players) {
            self.otherPlayers = self.physics.add.group();
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId === socket.id) {
                    self.playerManager.addPlayer(self, players[id], worldLayer, map);
                    console.log(`spawned ${players[id].name} in ${scene}`)
                    self.cameras.main.visible = true;
                    self.cameras.main.fadeIn(500);
                    document.getElementById('chatBox').style.display = 'block';
                } else {
                    self.playerManager.addOtherPlayers(self, players[id], worldLayer, scene);
                }
            });
            self.gameActive = true;
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
        socket.on('playerMoved', function(playerInfo) {
            self.playerManager.moveOtherPlayers(self, playerInfo, scene)
        })
        
        // Create cursor keys
        const cursors = new Cursors(this);

        // Debug graphics
        //cursors.debugGraphics(this, worldLayer);

        // remove players who leave the scene
        socket.on('playerChangedScene', function (player) {
            self.playerManager.changeScene(self, player, scene);
        })

        // remove players who leave the game
        socket.on('disconnectPlayer', function(player) {
            self.playerManager.deletePlayer(self, player);
            chat.alertRoom(self, `${player.name} left the game.`)
        })
        
    
    }

    update(time, delta) {

        if (!this.gameActive) {
            return
        }

        const playerActions = new PlayerActions(this);
        playerActions.movePlayer(this);


        // check if player has gone into main building
        if (this.playerContainer.body.position.x > 1155 && this.playerContainer.body.position.y < 590) {

            // pause player position
            this.playerContainer.body.moves = false;
            this.cameras.main.fadeOut(2000);

            let self = this;

            // change scene
            socket.off();

            let newScene = 'SceneMainBuilding';
            self.scene.start(newScene, self);
            self.anims.resumeAll();
            socket.emit("sceneChange", newScene);

        }
    
    }

}