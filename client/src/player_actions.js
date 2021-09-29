import { socket } from "../index.js";
import { playerSprite } from "../index.js";

export default class PlayerActions extends Phaser.Scene {

    constructor(scene) {
        super(scene);
    }

    movePlayer (self) {

        if (!self.gameActive || self.dialogueActive) {
            return
        }

        const speed = 175;
        const prevVelocity = self.playerContainer.body.velocity.clone();
        const prevPosition = self.playerContainer.body.position.clone();
    
        // if player has stopped in the last frame, tell server velocity is 0
        if (!self.stoppedLog && self.playerContainer.body.velocity.x === 0 && self.playerContainer.body.velocity.y === 0) {
            self.stoppedLog = true;
            socket.emit('playerMovement', {
                velocity: self.playerContainer.body.velocity,
                position: self.playerContainer.body.position
            });
        }
        
        // Stop any previous movement from the last frame
        self.playerContainer.body.velocity.x = 0;
        self.playerContainer.body.velocity.y = 0;
    
        // Handle player movement
        if (self.cursors.left.isDown) {
            self.playerContainer.body.setVelocityX(-speed);
            self.player.anims.play(`${playerSprite.spriteNum}-left-walk`, true);
            self.stoppedLog = false;
        } else if (self.cursors.right.isDown) {
            self.playerContainer.body.setVelocityX(speed);
            self.player.anims.play(`${playerSprite.spriteNum}-right-walk`, true);
            self.stoppedLog = false;
        } else if (self.cursors.up.isDown) {
            self.playerContainer.body.setVelocityY(-speed);
            self.player.anims.play(`${playerSprite.spriteNum}-back-walk`, true);
            self.stoppedLog = false;
        } else if (self.cursors.down.isDown) {
            self.playerContainer.body.setVelocityY(speed);
            self.player.anims.play(`${playerSprite.spriteNum}-front-walk`, true);
            self.stoppedLog = false;
        } else {
            self.player.anims.stop();
    
            // If movement stops, set idle frame
            if (prevVelocity.x < 0) self.player.setTexture(playerSprite.spriteSheet, playerSprite.left);
            else if (prevVelocity.x > 0) self.player.setTexture(playerSprite.spriteSheet, playerSprite.right);
            else if (prevVelocity.y < 0) self.player.setTexture(playerSprite.spriteSheet, playerSprite.back);
            else if (prevVelocity.y > 0) self.player.setTexture(playerSprite.spriteSheet, playerSprite.front);
        }

        // If player is colliding with an object or world boundary, don't send movement updates
        if (self.playerContainer.isColliding) {
            return;
        }
        
        // Send movement updates to server every frame
        const movementData = {
            velocity: self.playerContainer.body.velocity,
            position: self.playerContainer.body.position
        }
        socket.emit('playerMovement', movementData);
        /*
        if (prevVelocity.x !== self.playerContainer.body.velocity.x || prevVelocity.y !== self.playerContainer.body.velocity.y) {
            socket.emit('playerMovement', movementData);
            console.log('movement 1')
        } else if (prevPosition.x !== self.playerContainer.body.position.x || prevPosition.y !== self.playerContainer.body.position.y) {
            socket.emit('playerMovement', movementData);
            console.log('movement 2')
        }
        */
    }


}