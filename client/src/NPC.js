
export default class NPC extends Phaser.GameObjects.Sprite {

    constructor(scene, config) {
        super(scene, config.x, config.y, config.key);
        scene.physics.world.enable(this);
        scene.add.existing(this);
        
        this.setTexture(config.spritesheet, config.spritenum);
        this.setScale(2);
    
        this.dialogue = config.dialogue;
        this.scene = scene;
      }

    readDialogue (key) {

        this.scene.allowUserInput = false;

        // Read through dialogs in order, until stop property is detected
        this.scene.blurb = this.dialogue[key];
        this.showSubtitle(this.scene.blurb);

    }

    showSubtitle() {
        // make dialogue UI elements visible
        this.scene.subtitle.setAlpha(1)
        this.scene.subtitleBox.setAlpha(1)
        this.scene.subtitleArrow.setAlpha(1)
        const line = this.scene.blurb.say[this.scene.lineIndex];
        this.scene.subtitle.setText(this.typewriteTextWrapped(line, this.scene.blurb));

    }

    typewriteTextWrapped(text) {
        const lines = this.scene.subtitle.getWrappedText(text)
        const wrappedText = lines.join('\n')
    
        this.typewriteText(wrappedText, this.scene.blurb)
    }

    typewriteText(text) {
        const length = text.length
        let i = 0
        this.scene.time.addEvent({
            callback: () => {
                this.scene.subtitle.text += text[i]
                ++i
                if (i > (length - 1) ) {
                    this.userInput(this.scene.blurb); // called after text is all written
                }
            },
            repeat: length - 1,
            delay: 20
        })
    }

    userInput() {

        this.scene.allowUserInput = true;

        // if text was a question, show user answers
        if (this.scene.blurb.question) {
            this.showAnswers(this.scene.blurb);
        }

        // when user presses space...
        let keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        keySpace.on("down", () => {
            
            if (!this.scene.dialogueActive) {
                return;
            }
            if (!this.scene.allowUserInput) {
                return;
            }
            this.scene.allowUserInput = false;

            // if not a question, iterate to next line in blurb until no lines left
            if (!this.scene.blurb.question) {
                this.scene.lineIndex++;
                // if there are no lines left, go to next branch of tree
                if (this.scene.lineIndex >= this.scene.blurb.say.length) {
                    if (this.scene.blurb.linkTo !== false) {
                        this.scene.lineIndex = 0;
                        this.readDialogue(this.scene.blurb.linkTo)
                        return;
                    } else {
                        keySpace.reset();
                        this.exitDialogue();
                        return;
                    }
                    
                }
                // else, show next line
                this.showSubtitle(this.scene.blurb);
                return;
            }
            
            // else, for questions, hide the answer boxes 
            // and move to next branch in dialogue tree
            this.scene.subtitleBoxYes.setAlpha(0);
            this.scene.subtitleYes.setAlpha(0);
            this.scene.subtitleBoxNo.setAlpha(0);
            this.scene.subtitleNo.setAlpha(0);

            if (this.scene.subtitleBoxYes.selected) {
                this.readDialogue(this.scene.blurb.answers[0].linkTo)
            } else {
                this.readDialogue(this.scene.blurb.answers[1].linkTo)
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

        let keyDown = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        keyDown.on("down", () => {
            if (!this.scene.dialogueActive) {
                return;
            }
            this.scene.subtitleBoxYes.selected = !this.scene.subtitleBoxYes.selected;
            this.scene.subtitleBoxYes.isStroked = !this.scene.subtitleBoxYes.isStroked;

            this.scene.subtitleBoxNo.selected = !this.scene.subtitleBoxNo.selected;
            this.scene.subtitleBoxNo.isStroked = !this.scene.subtitleBoxNo.isStroked;
            keyDown.reset();
        });
        

    }

    createDialogueUI() {
        // Create subtitle text for player interaction with NPCs
        this.scene.subtitle = this.scene.add.text(0, 0, '(subtitle)', {
            fontFamily: 'monospace',
            color: '#000',
            //stroke: '#000',
            //strokeThickness: 3,
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
        this.scene.lineIndex = 0;

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

    exitDialogue() {
        console.log('exit dialogue');
        // hide answer boxes
        this.scene.subtitleBoxYes.setAlpha(0);
        this.scene.subtitleYes.setAlpha(0);
        this.scene.subtitleBoxNo.setAlpha(0);
        this.scene.subtitleNo.setAlpha(0);
        this.scene.subtitle.setAlpha(0);
        this.scene.subtitleBox.setAlpha(0);
        this.scene.subtitleArrow.setAlpha(0);

        //this.scene.blurb = null;
        this.scene.lineIndex = 0;
        this.scene.allowUserInput = false;

        let self = this;
        setTimeout(function () {
            self.scene.dialogueActive = false;
        }, 200);
    }

}