import { socket } from "../index.js";

export default class ChatManager extends Phaser.Scene {

    constructor(self) {
        super(self);

        this.chatArea = document.getElementById('messages');
        this.chatMessages = [];
        this.setChatActiveFalse(self);

        // add new chat messages to chat UI
        socket.on("message", (message) => {
            this.chatMessages.push(message);
            if (this.chatMessages.length > 15) {
                this.chatMessages.shift();
            }
            const el = document.createElement('li');
            el.innerText = message;
            this.chatArea.appendChild(el);
            this.chatArea.scrollTop = this.chatArea.scrollHeight;
        });
    }

    setChatActiveFalse(self) {
        self.chatActive = false;
    }

    reloadMessages(self, messages) {
        if (messages) {
            self.chatArea = document.getElementById('messages');
            for (let message of messages) {
                const el = document.createElement('li');
                el.innerText = message;
                self.chatArea.appendChild(el);
                self.chatArea.scrollTop = self.chatArea.scrollHeight;
            }
        }

    }

    alertRoom(self, message) {
        self.chatArea = document.getElementById('messages');
        const el = document.createElement('li');
        el.innerText = message;
        self.chatArea.appendChild(el);
        self.chatArea.scrollTop = self.chatArea.scrollHeight;
    }


}