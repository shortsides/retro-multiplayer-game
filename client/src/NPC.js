import { socket } from "../index.js";

export default class NPC extends Phaser.GameObjects.Sprite {

    constructor(scene, config) {
        super(scene, config.x, config.y);
        scene.physics.world.enable(this);
        scene.add.existing(this);
        
        this.body.setImmovable();
        this.body.setSize(config.width, config.height);
        this.setOrigin(0.5,0.5)
        this.setTexture(config.spritesheet, config.spritenum);
    
        this.dialogue = config.dialogue;
        this.scene = scene;
        this.blurb = null;
        this.lineIndex = 0;
        this.allowUserInput = false;
      }

    readDialogue (key) {

        this.allowUserInput = false;

        // Read through dialogs in order, until stop property is detected
        this.blurb = this.dialogue[key];
        this.showSubtitle();

    }

    showSubtitle() {

        // make dialogue UI elements visible
        this.scene.subtitle.setAlpha(1)
        this.scene.subtitleBox.setAlpha(1)
        this.scene.subtitleArrow.setAlpha(1)
        const line = this.blurb.say[this.lineIndex];
        this.scene.subtitle.setText(this.typewriteTextWrapped(line));

    }

    typewriteTextWrapped(text) {
        const lines = this.scene.subtitle.getWrappedText(text)
        const wrappedText = lines.join('\n')
    
        this.typewriteText(wrappedText)
    }

    typewriteText(text) {
        const length = text.length
        let i = 0
        this.scene.time.addEvent({
            callback: () => {
                this.scene.subtitle.text += text[i]
                ++i
                if (i > (length - 1) ) {
                    this.userInput(); // called after text is all written
                }
            },
            repeat: length - 1,
            delay: 20
        })
    }

    userInput() {

        this.allowUserInput = true;

        if (this.blurb === null) {
            return;
        }

        // if text was a question, show user answers
        if (this.blurb.question) {
            this.showAnswers(this.blurb);
        }

        // when user presses space...
        this.keySpace = this.scene.cursors.space.on("down", () => {
            
            if (!this.scene.dialogueActive) {
                return;
            }
            if (!this.allowUserInput) {
                return;
            }
            this.allowUserInput = false;

            // if not a question, iterate to next line in blurb until no lines left
            if (!this.blurb.question) {
                this.lineIndex++;
                // if there are no lines left, go to next branch of tree
                if (this.lineIndex >= this.blurb.say.length) {
                    if (this.blurb.linkTo !== false) {
                        this.lineIndex = 0;
                        this.readDialogue(this.blurb.linkTo)
                        // if a function is defined, perform function
                        if (typeof this.blurb.function !== "undefined") {
                            this.convoAction(this.blurb.function);
                        }
                        return;
                    } else {
                        // if a function is defined, perform function
                        if (typeof this.blurb.function !== "undefined") {
                            this.convoAction(this.blurb.function);
                        } else {
                            this.exitDialogue();
                            let self = this;
                            setTimeout(function () {
                                self.scene.dialogueActive = false;
                            }, 200);
                        }
                        return;
                    }
                    
                }
                // else, show next line
                this.showSubtitle(this.blurb);
                return;
            }
            
            // else, for questions, hide the answer boxes 
            // and move to next branch in dialogue tree
            this.scene.subtitleBoxYes.setAlpha(0);
            this.scene.subtitleYes.setAlpha(0);
            this.scene.subtitleBoxNo.setAlpha(0);
            this.scene.subtitleNo.setAlpha(0);

            // link to the next piece of dialogue depending on option chosen
            if (this.scene.subtitleBoxYes.selected) {

                // if a function is defined, perform function when player selects first answer
                if (typeof this.blurb.answers[0].function !== "undefined") {
                    this.convoAction(this.blurb.answers[0].function);
                }

                this.readDialogue(this.blurb.answers[0].linkTo)

            } else {
                this.readDialogue(this.blurb.answers[1].linkTo)
            }
            
        });

    }

    showAnswers(blurb) {

        this.scene.subtitleBoxYes.setAlpha(1);
        this.scene.subtitleYes.setAlpha(1);
        this.scene.subtitleYes.setText(blurb.answers[0].reply);
        this.scene.subtitleBoxYes.selected = true; // default selection to first answer option
        this.scene.subtitleBoxYes.setStrokeStyle(4, 0xefc53f);

        this.scene.subtitleBoxNo.setAlpha(1);
        this.scene.subtitleNo.setAlpha(1);
        this.scene.subtitleNo.setText(blurb.answers[1].reply);
        this.scene.subtitleBoxNo.selected = false;
        this.scene.subtitleBoxNo.setStrokeStyle(4, 0xefc53f);
        this.scene.subtitleBoxNo.isStroked = false;

        this.keyDown = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyUp = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
        this.keyDown.on("down", () => {

            if (Phaser.Input.Keyboard.JustDown(this.keyDown)) { // prevents duplication of keydown event

                if (!this.scene.dialogueActive) {
                    return;
                }
                this.toggleDialogueOptions();

            }
        });
        this.keyUp.on("down", () => {

            if (Phaser.Input.Keyboard.JustDown(this.keyUp)) {

                if (!this.scene.dialogueActive) {
                    return;
                }
                this.toggleDialogueOptions();

            }
        });
        

    }

    toggleDialogueOptions() {
        // toggle answer options
        this.scene.subtitleBoxYes.selected = !this.scene.subtitleBoxYes.selected;
        this.scene.subtitleBoxYes.isStroked = !this.scene.subtitleBoxYes.isStroked;

        this.scene.subtitleBoxNo.selected = !this.scene.subtitleBoxNo.selected;
        this.scene.subtitleBoxNo.isStroked = !this.scene.subtitleBoxNo.isStroked;
    }

    createDialogueUI() {
        // Create subtitle text for player interaction with NPCs
        this.scene.subtitle = this.scene.add.text(0, 0, '(subtitle)', {
            fontFamily: 'monospace',
            color: '#000',
            align: 'left',
            padding: 20,
            opacity: 0,
            wordWrap: {
                width: this.scene.cameras.main.width - 250,
                useAdvancedWrap: true
            }
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(40)
        .setAlpha(0)
        this.scene.subtitle.setPosition(110, 442 + this.scene.subtitle.displayHeight);
        this.lineIndex = 0;

        // create background box and next arrow
        this.scene.subtitleBox = this.scene.add.rectangle(this.scene.cameras.main.width / 2, 590, this.scene.cameras.main.width - 200, 90, 0xf4edf7)
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(30)
        .setAlpha(0)
        .setStrokeStyle(4, 0xf4edf7)

        this.scene.subtitleArrow = this.scene.add.triangle(680, 580, 0, 0, 6, 6, 12, 0, 0x383838)
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(35)
        .setAlpha(0)

        // create dialogue answer boxes
        this.scene.subtitleBoxYes = this.scene.add.rectangle(700, 450, 100, 30, 0xf4edf7)
        .setOrigin(1, 1)
        .setScrollFactor(0)
        .setDepth(30)
        .setAlpha(0)

        this.scene.subtitleYes = this.scene.add.text(650, 436, '(a1)', {
            fontFamily: 'monospace',
            color: '#000',
            align: 'center',
            opacity: 0,
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(40)
        .setAlpha(0)


        this.scene.subtitleBoxNo = this.scene.add.rectangle(700, 490, 100, 30, 0xf4edf7)
        .setOrigin(1, 1)
        .setScrollFactor(0)
        .setDepth(30)
        .setAlpha(0)

        this.scene.subtitleNo = this.scene.add.text(650, 476, '(a2)', {
            fontFamily: 'monospace',
            color: '#000',
            align: 'center',
            opacity: 0,
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(40)
        .setAlpha(0)
    }

    async exitDialogue() {
        // hide answer boxes
        this.scene.subtitleBoxYes.setAlpha(0);
        this.scene.subtitleYes.setAlpha(0);
        this.scene.subtitleBoxNo.setAlpha(0);
        this.scene.subtitleNo.setAlpha(0);
        this.scene.subtitle.setAlpha(0);
        this.scene.subtitleBox.setAlpha(0);
        this.scene.subtitleArrow.setAlpha(0);

        this.blurb = null;
        this.lineIndex = 0;
        this.allowUserInput = false;

        this.keySpace.destroy();
        if (typeof this.keyDown !== 'undefined') {
            this.keyDown.destroy();
            this.keyUp.destroy();
        }
        
    }

    facePlayer(playerDirection) {

    }

    convoAction(action) {
        if (action.type === "pickUp") {
            this.pickUpItem(action.props);
        }
        if (action.type === "giveItem") {
            this.giveItem(action.props);
        }
        if (action.type === "acceptQuest") {
            this.acceptQuest(action.props);
        }
        if (action.type === "addCoins") {
            this.addCoins(action.props.coinCount);
        }
        if (action.type === "callbackScene") {
            this.callbackScene(action.props.callback);
        }
    }

    pickUpItem(item) {
        console.log(`picked up ${item.name}`);
        
        // Add item to inventory
        this.scene.inventory.addItem(item);
    }

    addCoins(coinCount) {
        this.scene.inventory.coins+=coinCount;
        this.scene.inventory.displayCoins();
        this.scene.inventory.updateCoins();
    }

    giveItem(item) {

        while (item.num > 0) {
            // Remove item from inventory
            let itemSlot = this.scene.inventory.checkItem(item.name);
            this.scene.inventory.removeItem(itemSlot);
            item.num--;
        }

    }

    acceptQuest(quest) {
        socket.emit("acceptQuest", quest);
    }

    async callbackScene(callback) {
        await this.exitDialogue();
        this.scene.sceneCallbacks(callback);
    }

}