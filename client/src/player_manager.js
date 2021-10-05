import { client_id, devMode, lag_ms, socket } from "../index.js";
import { getUserSprite } from "../index.js";
import { playerSprite } from "../index.js";
import InventoryManager from "./Inventory.js";

export default class PlayerManager extends Phaser.Scene {

    constructor(scene) {
        super(scene);

        this.scene = scene;

        // ------------------------------ NEW PLAYER-SERVER MOVEMENT LOGIC ------------------------------
        this.messages = [];
        this.input_sequence_number = 0;
        this.pending_inputs = [];
        this.client_side_prediction = true;
        this.server_reconciliation = true;
        this.entity_interpolation = true;
        this.speed = 170;
    }

    // ------------------------------ NEW PLAYER-SERVER MOVEMENT LOGIC ------------------------------


    processServerMessages(player, otherPlayers) {
        while (true) {
            var message = this.receive();
            if (!message) {
              break;
            }

            for (var i = 0; i < message.length; i++) {
                var state = message[i];
                
                if (state.entity_id === client_id) {
                    // Received the authoritative position of this client's entity.
                    this.movethisPlayer(player, state);
                } else {
                    // Received the position of an entity other than this client's.
                    this.moveOtherPlayers(otherPlayers, state);
                }
            }
        }
    }


    processInputs(self) {

        // Compute delta time since last update.
        var now_ts = +new Date();
        var last_ts = self.last_ts || now_ts;
        var dt_sec = (now_ts - last_ts) / 1000.0;
        self.last_ts = now_ts;

        // Package player's input.
        var input;
        if (self.cursors.right.isDown) {
            input = { press_time: dt_sec, action: 'move_right' };
        } else if (self.cursors.left.isDown) {
            input = { press_time: dt_sec, action: 'move_left' };
        } else if (self.cursors.up.isDown) {
            input = { press_time: dt_sec, action: 'move_up' };
        } else if (self.cursors.down.isDown) {
            input = { press_time: dt_sec, action: 'move_down' };
        } else {
            // Nothing interesting happened.
            input = { press_time: dt_sec, action: 'stop' };
        }

        // Send the input to the server.
        input.input_sequence_number = this.input_sequence_number++;
        input.entity_id = client_id;
        input.lag_ms = lag_ms;
        socket.emit('playerMoved', input);

        // Do client-side prediction.
        if (this.client_side_prediction) {
            this.applyInput(input, self.playerContainer.body);
        }

        // Save this input for later reconciliation.
        this.pending_inputs.push(input);
    }


    receive() {
        var now = +new Date();
        for (var i = 0; i < this.messages.length; i++) {
          var message = this.messages[i];
          if (message.recv_ts <= now) {
            this.messages.splice(i, 1);
            return message.payload;
          }
        }
    }

    
    movethisPlayer(player, state) {

        // Update position
        /*
        player.body.position.x = state.position.x;
        player.body.position.y = state.position.y;
        */

        // Stop any previous movement from the last frame
        player.body.velocity.x = 0;
        player.body.velocity.y = 0;
        
        player.body.velocity.x = state.velocity.x;
        player.body.velocity.y = state.velocity.y;
        
        if (this.server_reconciliation) {
          // Server Reconciliation. Re-apply all the inputs not yet processed by
          // the server.
          var j = 0;
          while (j < this.pending_inputs.length) {
            var input = this.pending_inputs[j];
            if (input.input_sequence_number <= state.last_processed_input) {
              // Already processed. Its effect is already taken into account into the world update
              // we just got, so we can drop it.
              this.pending_inputs.splice(j, 1);
            } else {
              // Not processed by the server yet. Re-apply it.
              this.applyInput(input, player.body);
              j++;
            }
          }
        } else {
          // Reconciliation is disabled, so drop all the saved inputs.
          this.pending_inputs = [];
        }
    }

    playWalkingAnims(self, prevVelocity) {

        // Handle player movement animations
        if (self.cursors.left.isDown) {
            self.player.anims.play(`${playerSprite.spriteNum}-left-walk`, true);
            self.stoppedLog = false;
        } else if (self.cursors.right.isDown) {
            self.player.anims.play(`${playerSprite.spriteNum}-right-walk`, true);
            self.stoppedLog = false;
        } else if (self.cursors.up.isDown) {
            self.player.anims.play(`${playerSprite.spriteNum}-back-walk`, true);
            self.stoppedLog = false;
        } else if (self.cursors.down.isDown) {
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

    }

    applyInput(input, playerBody) {

        // Update position
        /*
        if (input.action === 'move_right') {
            playerBody.position.x += input.press_time*this.speed;
        } else if (input.action === 'move_left') {
            playerBody.position.x += -input.press_time*this.speed;
        } else if (input.action === 'move_up') {
            playerBody.position.y += -input.press_time*this.speed;
        } else if (input.action === 'move_down') {
            playerBody.position.y += input.press_time*this.speed;
        } else {
            return;
        }
        */

        // Stop any previous movement from the last frame
        playerBody.velocity.x = 0;
        playerBody.velocity.y = 0;

        if (input.action === 'move_right') {
            playerBody.setVelocityX(this.speed);
        } else if (input.action === 'move_left') {
            playerBody.setVelocityX(-this.speed);
        } else if (input.action === 'move_up') {
            playerBody.setVelocityY(-this.speed);
        } else if (input.action === 'move_down') {
            playerBody.setVelocityY(this.speed);
        } else {
            return;
        }
    }
    
    
    moveOtherPlayers(otherPlayers, state) {

        let self = this;

        otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (state.entity_id === otherPlayer.first.playerId) {

                if (!self.entity_interpolation) {
                    // Entity interpolation is disabled - just accept the server's data.
                    otherPlayer.body.position.x = state.position.x - 11;
                    otherPlayer.body.position.y = state.position.y - 15;

                    // Play walking animations for other player
                    self.playWalkingAnimsOtherPlayer(otherPlayer, state);

                } else {
                    // Add it to the position buffer.
                    var timestamp = +new Date();
                    otherPlayer.position_buffer.push([timestamp, state.position.x - 11, state.position.y - 15]);

                    // Play walking animations for other player
                    self.playWalkingAnimsOtherPlayer(otherPlayer, state);
                }

            }
        })    

    }

    interpolateEntities(otherPlayers) {
        if (!this.entity_interpolation) {
            return;
        }

        const server_update_rate = 10;

        // Compute render timestamp.
        var now = +new Date();
        var render_timestamp = now - (1000.0 / server_update_rate);

        otherPlayers.getChildren().forEach(function (otherPlayer) {
    
            // Find the two authoritative positions surrounding the rendering timestamp.
            var buffer = otherPlayer.position_buffer;

            // Drop older positions.
            while (buffer.length >= 2 && buffer[1][0] <= render_timestamp) {
            buffer.shift();
            }

            // Interpolate between the two surrounding authoritative positions.
            if (buffer.length >= 2 && buffer[0][0] <= render_timestamp && render_timestamp <= buffer[1][0]) {
            var x0 = buffer[0][1];
            var x1 = buffer[1][1];
            var t0 = buffer[0][0];
            var t1 = buffer[1][0];

            var y0 = buffer[0][2];
            var y1 = buffer[1][2];

            otherPlayer.body.position.x = x0 + (x1 - x0) * (render_timestamp - t0) / (t1 - t0);
            otherPlayer.body.position.y = y0 + (y1 - y0) * (render_timestamp - t0) / (t1 - t0);
            }
        })
    }

    playWalkingAnimsOtherPlayer(otherPlayer, state) {
        
        if (state.velocity.x < 0) { // left
            otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-left-walk`, true);
        } else if (state.velocity.x > 0) { // right
            otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-right-walk`, true);
        } else if (state.velocity.y < 0) { // up
            otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-back-walk`, true);
        } else if (state.velocity.y > 0) { // down
            otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-front-walk`, true);
        } else {
            otherPlayer.first.anims.stop();

            // If movement stops, set idle frame
            if (state.sprite === 'left') otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.left);
            else if (state.sprite === 'right') otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.right);
            else if (state.sprite === 'back') otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.back);
            else if (state.sprite === 'front') otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.front);
        }
    }


// -------------------------------------------------------------------------------------------



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

        // create inventory object
        this.createPlayerInventory(self, playerInfo.inventory, playerInfo.coins);

        // debug coordinates
        if (devMode) {
            this.debugCoordinates(self);
        }

        console.log(`spawned ${playerInfo.name} in ${playerInfo.scene}`)

    }

    createPlayerInventory(self, inventory, coins) {
        self.inventory = new InventoryManager(self);
        self.inventory.loadItems(inventory, coins);
    }

    addOtherPlayers(self, playerInfo, worldLayer) {

        if (playerInfo.scene !== this.scene) {
            console.log(playerInfo.scene);
            return;
        }
    
        // select a sprite for player based on hash of their username
        let otherPlayerSprite = getUserSprite(playerInfo.name);

        // create other player container for sprite and floating name
        const otherPlayerContainer = self.add.container(playerInfo.position.x, playerInfo.position.y)
        otherPlayerContainer.setSize(22, 30);

        // add other player sprite
        const otherPlayer = self.physics.add
        .sprite(0, -4, otherPlayerSprite.spriteSheet, otherPlayerSprite.front)
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
        otherPlayerContainer.sprite = otherPlayerSprite;
        self.physics.world.enable(otherPlayerContainer);
    
        // Watch the other player and worldLayer for collisions
        self.physics.add.collider(otherPlayerContainer, worldLayer);

        // add other player to list of otherplayers
        self.otherPlayers.add(otherPlayerContainer);
        
        otherPlayerContainer.position_buffer = [];
    }


    // ------------------------------ OLD MOVEMENT LOGIC ---------------------------------------------------
    /*
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
                    otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-left-walk`, true);
                } else if (otherPlayer.body.velocity.x > 0) {
                    otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-right-walk`, true);
                } else if (otherPlayer.body.velocity.y < 0) {
                    otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-back-walk`, true);
                } else if (otherPlayer.body.velocity.y > 0) {
                    otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-front-walk`, true);
                } else {
                    otherPlayer.first.anims.stop();

                    // If we were moving, pick and idle frame to use
                    if (prevVelocity.x < 0) otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.left);
                    else if (prevVelocity.x > 0) otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.right);
                    else if (prevVelocity.y < 0) otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.back);
                    else if (prevVelocity.y > 0) otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.front);
                }

                if (ticker === 'ticker') {
                    // Update position as per server data
                    otherPlayer.setPosition(playerInfo.position.x + 11, playerInfo.position.y + 15)
                    //self.interpolatePositions(playerInfo.position, otherPlayer)
                }
                
            }

        })
    }
    */


    changeScene (self, player, scene) {

        this.pending_inputs = [];

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

    debugCoordinates(self) {

        self.debugPos = self.add.text(400, 16, ``, {
            font: "14px monospace",
            fill: "#ffffff",
        })
        .setScrollFactor(0)
        .setColor("#ffffff");
    }


}