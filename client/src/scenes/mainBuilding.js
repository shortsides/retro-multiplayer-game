import { SPRITES } from "../../index.js";
import { socket } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Anims from "../anim_manager.js";
import Cursors from "../cursors.js";
import PlayerActions from "../player_actions.js";
import ChatManager from "../chat_manager.js";

export default class SceneMainBuilding extends Phaser.Scene {

    constructor() {
        super('SceneMainBuilding');
    }

    init() {
        this.gameActive = false;
        this.stoppedLog = true;
        this.otherPlayers;
    }

    preload() {

        this.load.image("tiles", "assets/tilesets/interior_atlas_extruded.png");
        this.load.tilemapTiledJSON("map", "assets/tilesets/main-interior.json");

        // load chat input field
        this.load.html("chat", "chat_form.html");

        // load spritesheets
        this.load.spritesheet(SPRITES[0].spriteSheet, SPRITES[0].spriteSheetPath, 
        { frameWidth: 16, frameHeight: 20 });
        this.load.spritesheet(SPRITES[4].spriteSheet, SPRITES[4].spriteSheetPath, 
        { frameWidth: 16, frameHeight: 20 });
        this.load.spritesheet(SPRITES[8].spriteSheet, SPRITES[8].spriteSheetPath, 
            { frameWidth: 16, frameHeight: 20 });
    }

    create() {

        const scene = 'SceneMainBuilding';

        let self = this;    
    
        const map = this.make.tilemap({ key: "map" });
    
        // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
        // Phaser's cache (i.e. the name you used in preload)
        const tileset = map.addTilesetImage("interior_atlas", "tiles", 32, 32, 1, 2);
    
        // Parameters: layer name (or index) from Tiled, tileset, x, y
        const floorLayer = map.createLayer("Floor", tileset, 0, 0);
        const belowLayer = map.createLayer("Below Player", tileset, 0, 0);
        const worldLayer = map.createLayer("World", tileset, 0, 0);
        const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);
    
        worldLayer.setCollisionByProperty({ collides: true });
        aboveLayer.setDepth(10);

        // Create chat window
        this.chat = this.add.dom(160, 100).createFromCache("chat")
            .setScrollFactor(0)
            .setDepth(30)

        let chat = new ChatManager(this);

        this.registry.set('chatMessages', chat.chatMessages);
        
        let playerManager = new PlayerManager(this);
    
        // When this player joins, spawn all current players in room
        socket.on('currentPlayers', function (players) {
            self.otherPlayers = self.physics.add.group();
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId === socket.id) {
                    playerManager.addPlayer(self, players[id], worldLayer, map);
                } else {
                    playerManager.addOtherPlayers(self, players[id], worldLayer, scene);
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
                console.log(`${playerInfo.name} joined the game`);
                chat.alertRoom(self, `${playerInfo.name} joined the game.`)
            }
            playerManager.addOtherPlayers(self, playerInfo, worldLayer, scene);
            
        })
    
        // Handle other player movements
        socket.on('playerMoved', function(playerInfo) {
            playerManager.moveOtherPlayers(self, playerInfo, scene)
        })
    
        // Create the players' walking animations from the spritesheet. 
        // These are stored in the global animation manager 
        const animManager = new Anims(this);
        animManager.createAnims(this)

    
        // Create cursor keys
        const cursors = new Cursors(this);

        // Debug graphics
        //cursors.debugGraphics(this, worldLayer);

        // remove players who leave the scene
        socket.on('playerChangedScene', function (player) {
            playerManager.changeScene(self, player, scene);
        })
        
    
    }

    update(time, delta) {

        if (!this.gameActive) {
            return
        }

        const playerActions = new PlayerActions(this);
        playerActions.movePlayer(this);
        
        // check if player has left main building
        if (this.playerContainer.body.position.y > 640) {

            // pause player position
            this.playerContainer.body.moves = false;
            this.cameras.main.fadeOut(2000);

            let self = this;

            // after 250ms, change scene
            setTimeout(function(){

                socket.off();
    
                let newScene = 'SceneWorld';
                self.scene.start(newScene, self);
                self.anims.resumeAll();
                socket.emit("sceneChange", newScene);
                
            }, 250)


        }
    
    }

}