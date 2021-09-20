import { SPRITES } from "../../index.js";
import { socket } from "../../index.js";

import PlayerManager from "../player_manager.js";
import Anims from "../anim_manager.js";
import Cursors from "../cursors.js";
import PlayerActions from "../player_actions.js";
import ChatManager from "../chat_manager.js";
import { playerName } from "../../index.js";

export default class TitleScene extends Phaser.Scene {

    constructor() {
        super('TitleScene');
    }

    preload() {

        // load main building
        this.load.image("tiles", "../../assets/tilesets/interior_atlas_extruded.png");
        this.load.tilemapTiledJSON("map", "../../assets/tilesets/main-interior.json");

        // load world
        this.load.image("tiles-world", "../../assets/tilesets/world_atlas.png");
        this.load.tilemapTiledJSON("map-world", "../../assets/tilesets/world_v1.json");

        // load chat input field
        this.load.html("chat", "../../chat_form.html");

        // load spritesheets
        this.load.spritesheet(SPRITES[0].spriteSheet, SPRITES[0].spriteSheetPath, 
        { frameWidth: 16, frameHeight: 20 });
        this.load.spritesheet(SPRITES[4].spriteSheet, SPRITES[4].spriteSheetPath, 
        { frameWidth: 16, frameHeight: 20 });
        this.load.spritesheet(SPRITES[8].spriteSheet, SPRITES[8].spriteSheetPath, 
            { frameWidth: 16, frameHeight: 20 });

        // environment animations
        this.load.spritesheet("fire", "../../assets/sprites/fire.png", { frameWidth: 16, frameHeight: 20 });
        this.load.spritesheet("fire2", "../../assets/sprites/fire2.png", { frameWidth: 16, frameHeight: 20 });

        let self = this;

        this.load.once('complete', function() {
            
            console.log('loading complete');
            self.scene.start('SceneMainBuilding');

            setTimeout(function () {
                socket.emit('playGame', playerName);
            }, 1000)

        });
    }

    create() {

        // Create the players' walking animations from the spritesheet. 
        // These are stored in the global animation manager 
        const animManager = new Anims(this);
        animManager.createAnims(this)

        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

        // say 'joining server...' in case loading assets takes a while
        this.add.text(screenCenterX, screenCenterY, 'Joining Server...', {
            font: "18px Monospace", 
            fill: "#fff"
        })
        .setOrigin(0.5);
    
    }

}