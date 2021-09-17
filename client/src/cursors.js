import { socket } from "../index.js";
import { playerName } from "../index.js";

export default class Cursors extends Phaser.Scene {

    constructor(self) {
        super(self);

        self.cursors = {
            left: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            up: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            enter: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
            shift: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
        }

        // If "Enter" is pressed, send message
        self.cursors.enter.on("down", event => {
            self.chatInput = self.chat.getChildByName("chatInput");
    
            self.chatInput.select();
            
            if (self.chatInput.value != "") {
                let message = `[${playerName}] ${self.chatInput.value}`
                socket.emit("message", message);
                self.chatInput.value = "";
            }
        })

        // Toggle chat visibility using "Shift" key
        self.cursors.shift.on("down", () => {
            self.chatArea = document.getElementById('messages');
            if (self.chatArea.style.display === 'block') {
                self.chatArea.style.display = 'none';
            } else {
                self.chatArea.style.display = 'block';
                self.chatArea.scrollTop = self.chatArea.scrollHeight;
            }
        })
    }

    debugGraphics (self, worldLayer) {
        self.input.keyboard.once("keydown-D", event => {
            // Turn on physics debugging to show player's hitbox
            self.physics.world.createDebugGraphic();
    
            // Create worldLayer collision graphic above the player, but below the help text
            const graphics = self.add
                .graphics()
                .setAlpha(0.75)
                .setDepth(20);
            worldLayer.renderDebug(graphics, {
                tileColor: null, // Color of non-colliding tiles
                collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
                faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
            });
        });
    }
}