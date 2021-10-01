import { socket } from "../index.js";
import { getUserSprite } from "../index.js";
import { playerSprite } from "../index.js";
import InventoryManager from "./Inventory.js";

export default class PlayerManager extends Phaser.Scene {

    constructor(scene) {
        super(scene);
    }

    addPlayer(self, playerInfo, worldLayer, map) {

        // create player container for sprite and floating name
        self.playerContainer = self.add.container(playerInfo.position.x, playerInfo.position.y)
        self.playerContainer.setSize(22, 30);
        
        // add player sprite
        self.player = self.physics.add
        .sprite(0, -4, playerSprite.spriteSheet, playerSprite.front)
        .setScale(2)
    
        // add player floating name
        self.playerName = self.add.text(0, -30, `${playerInfo.name}`, {
            font: "14px monospace",
            fill: "#ffffff",
        })
        .setOrigin(0.5)
        .setColor("#ffffff");

        // add player sprite and name to player container
        self.playerContainer.add(self.player);
        self.playerContainer.add(self.playerName);

        // enable physics for player container
        self.physics.world.enable(self.playerContainer);
        self.physics.add.collider(self.playerContainer, worldLayer, function() {
            self.playerContainer.isColliding = true;
        });

        const camera = self.cameras.main;
        camera.startFollow(self.playerContainer);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        camera.visible = true;
        camera.fadeIn(500);

        this.createPlayerInventory(self, playerInfo.inventory, playerInfo.coins);

        console.log(`spawned ${playerInfo.name} in ${playerInfo.scene}`)

    }

    createPlayerInventory(self, inventory, coins) {
        self.inventory = new InventoryManager(self);
        self.inventory.loadItems(inventory, coins);
    }

    addOtherPlayers(self, playerInfo, worldLayer, scene) {

        if (playerInfo.scene !== scene) {
            return;
        }
    
        // select a sprite for player based on hash of their username
        self.otherPlayerSprite = getUserSprite(playerInfo.name);

        // create other player container for sprite and floating name
        const otherPlayerContainer = self.add.container(playerInfo.position.x, playerInfo.position.y)
        otherPlayerContainer.setSize(30, 32);

        // add other player sprite
        const otherPlayer = self.physics.add
        .sprite(0, -4, self.otherPlayerSprite.spriteSheet, self.otherPlayerSprite.front)
        .setScale(2)

        otherPlayer.playerId = playerInfo.playerId;

        // add other player floating name
        const otherPlayerName = self.add.text(0, -30, `${playerInfo.name}`, {
            font: "14px monospace",
            fill: "#ffffff",
        })
        .setOrigin(0.5)
        .setColor("#ffffff");

        // add other player sprite and name to player container
        otherPlayerContainer.add(otherPlayer);
        otherPlayerContainer.add(otherPlayerName);
        self.physics.world.enable(otherPlayerContainer);
    
        // Watch the other player and worldLayer for collisions
        self.physics.add.collider(otherPlayerContainer, worldLayer);

        // add other player to list of otherplayers
        self.otherPlayers.add(otherPlayerContainer);

    }

    moveOtherPlayers(self, playerInfo, ticker, scene) {

        if (playerInfo.scene !== scene) {
            return;
        }

        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.first.playerId) {

                const prevVelocity = otherPlayer.body.velocity.clone();

                // Stop any previous movement from the last frame
                otherPlayer.body.setVelocity(0);

                // Update velocity as per server data
                otherPlayer.body.setVelocityX(playerInfo.velocity.x);
                otherPlayer.body.setVelocityY(playerInfo.velocity.y);

            
                // Handle walking animations
                if (otherPlayer.body.velocity.x < 0) {
                    otherPlayer.first.anims.play(`${self.otherPlayerSprite.spriteNum}-left-walk`, true);
                } else if (otherPlayer.body.velocity.x > 0) {
                    otherPlayer.first.anims.play(`${self.otherPlayerSprite.spriteNum}-right-walk`, true);
                } else if (otherPlayer.body.velocity.y < 0) {
                    otherPlayer.first.anims.play(`${self.otherPlayerSprite.spriteNum}-back-walk`, true);
                } else if (otherPlayer.body.velocity.y > 0) {
                    otherPlayer.first.anims.play(`${self.otherPlayerSprite.spriteNum}-front-walk`, true);
                } else {
                    otherPlayer.first.anims.stop();

                    // If we were moving, pick and idle frame to use
                    if (prevVelocity.x < 0) otherPlayer.first.setTexture(self.otherPlayerSprite.spriteSheet, self.otherPlayerSprite.left);
                    else if (prevVelocity.x > 0) otherPlayer.first.setTexture(self.otherPlayerSprite.spriteSheet, self.otherPlayerSprite.right);
                    else if (prevVelocity.y < 0) otherPlayer.first.setTexture(self.otherPlayerSprite.spriteSheet, self.otherPlayerSprite.back);
                    else if (prevVelocity.y > 0) otherPlayer.first.setTexture(self.otherPlayerSprite.spriteSheet, self.otherPlayerSprite.front);
                    
                }

                if (ticker === 'ticker') {
                    // Update position as per server data
                    otherPlayer.setPosition(playerInfo.position.x + 11, playerInfo.position.y + 15)
                    //self.interpolatePositions(playerInfo.position, otherPlayer)
                }
                
            }

        })
    }

    // TBC
    interpolatePositions(truePos, otherPlayer) {

        let trueX = truePos.x;
        let trueY = truePos.y;

        let deltaX = trueX - otherPlayer.body.position.x; // need to keep checking this as it changes?
        let deltaY = trueY - otherPlayer.body.position.y;

        if (otherPlayer.body.position.x < trueX) { 
            otherPlayer.body.setVelocityX(170)
        }
        if (otherPlayer.body.position.x > trueX) { 
            otherPlayer.body.setVelocityX(-170)
        }
        if (otherPlayer.body.position.y < trueY) { 
            otherPlayer.body.setVelocityY(170)
        }
        if (otherPlayer.body.position.y > trueY) { 
            otherPlayer.body.setVelocityY(-170)
        }


    }

    changeScene (self, player, scene) {
        if (player.playerId !== socket.id) {
            if (player.scene === scene) {

                // remove player from otherPlayers
                self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                    if (otherPlayer.first.playerId === player.playerId) {
                        console.log(`${player.name} left ${scene}`);
                        otherPlayer.destroy();
                    }
                })
            }
        }
    }

    deletePlayer (self, playerId, playerName) {
        // remove player from otherPlayers
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (otherPlayer.first.playerId === playerId) {
                console.log(`${playerName} left the game`);
                otherPlayer.destroy();
            }
        })
    }


}