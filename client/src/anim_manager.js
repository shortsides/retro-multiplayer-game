import { CHARSPRITES, SPRITES } from "../index.js";
import { FRAME_RATE } from "../index.js";

export default class Anims extends Phaser.Scene {

    constructor(scene) {
        super(scene);
    }
    
    // Create animations from spritesheets. 
    // These are stored in the global animation manager
    createAnims (self) {
        let anims = self.anims;

        /*
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
        */

        for (let s of CHARSPRITES) {

            // WALKING ANIMS
            anims.create({
                key: `${s.spriteNum}-front-walk`,
                frames: self.anims.generateFrameNames(s.spriteSheet, {
                    start: s.front,
                    end: s.front + 5
                    }),
                frameRate: FRAME_RATE,
                repeat: -1
            });
            anims.create({
                key: `${s.spriteNum}-left-walk`,
                frames: self.anims.generateFrameNames(s.spriteSheet, {
                    start: s.left,
                    end: s.left + 5
                    }),
                frameRate: FRAME_RATE,
                repeat: -1
            });
            anims.create({
                key: `${s.spriteNum}-right-walk`,
                frames: self.anims.generateFrameNames(s.spriteSheet, {
                    start: s.right,
                    end: s.right + 5
                    }),
                frameRate: FRAME_RATE,
                repeat: -1
            });
            anims.create({
                key: `${s.spriteNum}-back-walk`,
                frames: self.anims.generateFrameNames(s.spriteSheet, {
                    start: s.back,
                    end: s.back + 5
                    }),
                frameRate: FRAME_RATE,
                repeat: -1
            });


            // ATTACK ANIMS
            anims.create({
                key: `${s.spriteSheet}-left-sword`,
                frames: self.anims.generateFrameNames(`${s.spriteSheet}-sword`, {
                    start: s.attack_sword_left,
                    end: s.attack_sword_left + 8
                    }),
                frameRate: FRAME_RATE,
                repeat: 0
            });
            anims.create({
                key: `${s.spriteSheet}-right-sword`,
                frames: self.anims.generateFrameNames(`${s.spriteSheet}-sword`, {
                    start: s.attack_sword_right,
                    end: s.attack_sword_right + 8
                    }),
                frameRate: FRAME_RATE,
                repeat: 0
            });
            anims.create({
                key: `${s.spriteSheet}-back-sword`,
                frames: self.anims.generateFrameNames(`${s.spriteSheet}-sword`, {
                    start: s.attack_sword_back,
                    end: s.attack_sword_back + 8
                    }),
                frameRate: FRAME_RATE,
                repeat: 0
            });
            anims.create({
                key: `${s.spriteSheet}-front-sword`,
                frames: self.anims.generateFrameNames(`${s.spriteSheet}-sword`, {
                    start: s.attack_sword_front,
                    end: s.attack_sword_front + 8
                    }),
                frameRate: FRAME_RATE,
                repeat: 0
            });

        }


        // FIRE ANIMS
        anims.create({
            key: 'fire_anim',
            frames: self.anims.generateFrameNames('fire', {
                start: 0,
                end: 5
                }),
            frameRate: FRAME_RATE,
            repeat: -1
        })
        anims.create({
            key: 'fire_anim2',
            frames: self.anims.generateFrameNames('fire2', {
                start: 0,
                end: 5
                }),
            frameRate: FRAME_RATE,
            repeat: -1
        })

        
        // NPC FIGHTING ANIMS
        anims.create({
            key: `midora-sword-attack`,
            frames: self.anims.generateFrameNames('midora-sword', {
                start: 0,
                end: 15
                }),
            frameRate: FRAME_RATE,
            repeat: -1
        });
        anims.create({
            key: `midora-sword-attack-short`,
            frames: self.anims.generateFrameNames('midora-sword-short', {
                start: 0,
                end: 8
                }),
            frameRate: FRAME_RATE,
            repeat: 0
        });

    }



}