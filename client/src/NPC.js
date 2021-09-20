
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

        // Read through dialogs in order, until stop property is detected
        const blurb = this.dialogue[key];
        this.showSubtitle(blurb);

    }

    showSubtitle(blurb) {
        this.scene.subtitle.setAlpha(1)
        const line = blurb.say[this.scene.lineIndex];
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
            },
            repeat: length - 1,
            delay: 50
        })
    }

}