import { socket } from "../index.js";

export default class QuestManager extends Phaser.Scene {

    constructor(scene) {
            super(scene)
            this.scene = scene;

            this.quests = [];

            socket.on("refreshQuestData", quests => {
                console.log('refreshed quest data');
                this.quests = quests;
            })
        }

        // Set local copy of player quests to quests from server
        loadQuests(quests) {
            this.quests = quests;
        }

        endQuest(quest) {
            
        }

}