import { SPRITES } from "./index.js";
import { socket } from "./index.js";

import PlayerManager from "./player_manager.js";
import Anims from "./anims.js";
import Cursors from "./cursors.js";
import PlayerActions from "./player_actions.js";
import ChatManager from "./chat_manager.js";

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

        this.load.image("tiles-world", "https://mikewesthad.github.io/phaser-3-tilemap-blog-posts/post-1/assets/tilesets/tuxmon-sample-32px-extruded.png");
        this.load.tilemapTiledJSON("map-world", "https://mikewesthad.github.io/phaser-3-tilemap-blog-posts/post-1/assets/tilemaps/tuxemon-town.json");

    }

    create() {

        const scene = 'SceneWorld';

        let self = this;
    
        const map = this.make.tilemap({ key: "map-world" });
    
        // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
        // Phaser's cache (i.e. the name you used in preload)
        const tileset = map.addTilesetImage("tuxmon-sample-32px-extruded", "tiles-world");
    
        // Parameters: layer name (or index) from Tiled, tileset, x, y
        const belowLayer = map.createLayer("Below Player", tileset, 0, 0);
        const worldLayer = map.createLayer("World", tileset, 0, 0);
        const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);
    
        worldLayer.setCollisionByProperty({ collides: true });
        aboveLayer.setDepth(10);
    
    
        let playerManager = new PlayerManager(this);

        this.cameras.main.fadeIn(2000);

        // When this player joins, spawn all current players in room
        socket.on('currentPlayers', function (players) {
            self.otherPlayers = self.physics.add.group();
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId === socket.id) {
                    playerManager.addPlayer(self, players[id], worldLayer, map);
                    console.log(`spawned ${players[id].name} in ${scene}`)
                } else {
                    playerManager.addOtherPlayers(self, players[id], worldLayer, scene);
                }
            });
            self.gameActive = true;
        });
        
        // When a new player joins, spawn them
        socket.on('newPlayer', function (playerInfo) {
            if (playerInfo.playerId === socket.id) {
                return;
            } else {
                console.log(`${playerInfo.name} joined ${scene}`);
                playerManager.addOtherPlayers(self, playerInfo, worldLayer, scene);
            }
        })
    
        // Handle other player movements
        socket.on('playerMoved', function(playerInfo) {
            playerManager.moveOtherPlayers(self, playerInfo, scene)
        })
    
        // Create the players' walking animations from the spritesheet. 
        // These are stored in the global animation manager 
        const animManager = new Anims(this);
        animManager.createAnims(this)
    
        // Create chat window
        this.chat = this.add.dom(160, 100).createFromCache("chat")
            .setScrollFactor(0)
            .setDepth(30)

        // Reload messages from previous scene into chat
        let chat = new ChatManager(this);
        let messages = this.registry.get('chatMessages')
        chat.reloadMessages(this, messages);
        

        // Create cursor keys
        const cursors = new Cursors(this);

        // Debug graphics
        //cursors.debugGraphics(this, worldLayer);

        // remove players who leave the scene
        /*
        socket.on('playerChangedScene', function (player) {
            playerManager.changeScene(self, player, scene);
        })
        */
        
    
    }

    update(time, delta) {

        const playerActions = new PlayerActions(this);
        playerActions.movePlayer(this);
    
    }

}