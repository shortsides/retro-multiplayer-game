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
            shift: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
            space: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            // temporary fighting keys
            w: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            a: self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        }

        // allow all keys to be used in DOM elements e.g. using SPACE in typing in chat
        self.input.keyboard.disableGlobalCapture()

        // If "Enter" is pressed, send message
        self.cursors.enter.on("down", event => {
            self.chatInput = self.chat.getChildByName("chatInput");
            
            if (self.chatInput.value != "") {
                let message = `[${playerName}] ${self.chatInput.value}`
                socket.emit("message", message);
                self.chatInput.value = "";
                self.chatInput.blur();
                self.chatActive = false;
            } else if (document.activeElement.nodeName !== 'INPUT') {
                self.chatInput.select();
                self.chatActive = true;
            } else {
                self.chatInput.blur();
                self.chatActive = false;
            }
        })

        // Toggle chat visibility using "Shift" key
        self.cursors.shift.on("down", () => {
            self.chatInput = self.chat.getChildByName("chatInput");
            self.chatArea = document.getElementById('messages');
            self.chatBox = document.getElementById('chatBox')
            if (self.chatArea.style.display === 'block') {
                self.chatArea.style.display = 'none';
                self.chatInput.blur();
                self.chatBox.style.opacity = 0.4;
                self.chatActive = false;
            } else {
                self.chatArea.style.display = 'block';
                self.chatInput.select();
                self.chatActive = true;
                self.chatArea.scrollTop = self.chatArea.scrollHeight;
                self.chatBox.style.opacity = 0.8;
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