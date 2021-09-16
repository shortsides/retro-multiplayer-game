import { SPRITES } from "./index.js";
import { FRAME_RATE } from "./index.js";

export default class Anims extends Phaser.Scene {

    constructor(scene) {
        super(scene);
    }
    
    // Create the player's walking animations from the spritesheet. 
    // These are stored in the global animation manager
    createAnims (self) {
        let anims = self.anims;
        for (let s of SPRITES) {
            anims.create({
                key: `${SPRITES.indexOf(s)}-front-walk`,
                frames: self.anims.generateFrameNames(s.spriteSheet, {
                    start: s.front,
                    end: s.front + 3
                    }),
                frameRate: FRAME_RATE,
                repeat: -1
            });
            anims.create({
                key: `${SPRITES.indexOf(s)}-left-walk`,
                frames: self.anims.generateFrameNames(s.spriteSheet, {
                    start: s.left,
                    end: s.left + 3
                    }),
                frameRate: FRAME_RATE,
                repeat: -1
            });
            anims.create({
                key: `${SPRITES.indexOf(s)}-right-walk`,
                frames: self.anims.generateFrameNames(s.spriteSheet, {
                    start: s.right,
                    end: s.right + 3
                    }),
                frameRate: FRAME_RATE,
                repeat: -1
            });
            anims.create({
                key: `${SPRITES.indexOf(s)}-back-walk`,
                frames: self.anims.generateFrameNames(s.spriteSheet, {
                    start: s.back,
                    end: s.back + 3
                    }),
                frameRate: FRAME_RATE,
                repeat: -1
            });
        }
    }

}