import { client_id, devMode, lag_ms, socket } from "../index.js";
import { getUserSprite } from "../index.js";
import { playerSprite } from "../index.js";
import InventoryManager from "./Inventory.js";

export default class PlayerManager extends Phaser.Scene {

    constructor(scene) {
        super(scene);

        this.scene = scene;

        this.messages = [];
        this.input_sequence_number = 0;
        this.pending_inputs = [];
        this.client_side_prediction = true;
        this.server_reconciliation = true;
        this.entity_interpolation = true;
        this.speed = 140;
        this.direction = 'front';
        this.allowSendInputs = true;
        this.currentAction = null;
    }


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

        // Record action
        if (this.currentAction === 'attack') {
            input = { press_time: 0.01, action: 'attack' };
            this.allowSendInputs = false;
            this.sendInputs(self, input);
            return;
        }

        // Record movement
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

        this.sendInputs(self, input);
        return;

    }

    sendInputs(self, input) {

        // Send the input to the server.
        input.input_sequence_number = this.input_sequence_number++;
        input.entity_id = client_id;
        input.lag_ms = lag_ms;
        input.direction = this.direction;
        input.position = self.playerContainer.body.position;
        socket.emit('playerMoved', input);

        // Do client-side prediction.
        if (this.client_side_prediction) {
            this.applyInput(input, self.playerContainer);
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

        // Stop any previous movement from the last frame
        player.body.velocity.x = 0;
        player.body.velocity.y = 0;
        
        // Update velocity
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
              this.applyInput(input, player);
              j++;
            }
          }
        } else {
          // Reconciliation is disabled, so drop all the saved inputs.
          this.pending_inputs = [];
        }
    }

    playerAnims(self) {

        if (!self.gameActive) {
            return;
        }

        // Player fighting animations
        self.cursors.a.on("down", () => {

            if (!self.chatActive) {

                if (self.allowedActions.attack) {
                    self.allowedActions.move = false;
                    self.allowedActions.attack = false;
                    this.currentAction = 'attack';
        
                    if (this.direction === 'left') {
                        self.player.anims.play(`${playerSprite.spriteSheet}-left-sword`);
                    } else if (this.direction === 'right') {
                        self.player.anims.play(`${playerSprite.spriteSheet}-right-sword`);
                    } else if (this.direction === 'back') {
                        self.player.anims.play(`${playerSprite.spriteSheet}-back-sword`);
                    } else if (this.direction === 'front') {
                        self.player.anims.play(`${playerSprite.spriteSheet}-front-sword`);
                    }
                }

            }

        })

        // Player movement animations
        if (self.allowedActions.move) {
            if (self.cursors.left.isDown) {
                self.player.anims.play(`${playerSprite.spriteNum}-left-walk`, true);
                this.direction = 'left';
                self.stoppedLog = false;
            } else if (self.cursors.right.isDown) {
                self.player.anims.play(`${playerSprite.spriteNum}-right-walk`, true);
                this.direction = 'right';
                self.stoppedLog = false;
            } else if (self.cursors.up.isDown) {
                self.player.anims.play(`${playerSprite.spriteNum}-back-walk`, true);
                this.direction = 'back';
                self.stoppedLog = false;
            } else if (self.cursors.down.isDown) {
                self.player.anims.play(`${playerSprite.spriteNum}-front-walk`, true);
                this.direction = 'front';
                self.stoppedLog = false;
            } 
            // If movement stops, stop anims and set idle frame
            else {

                self.player.anims.stop();
                
                if (this.direction === 'left') self.player.setTexture(playerSprite.spriteSheet, playerSprite.left);
                else if (this.direction === 'right') self.player.setTexture(playerSprite.spriteSheet, playerSprite.right);
                else if (this.direction === 'back') self.player.setTexture(playerSprite.spriteSheet, playerSprite.back);
                else if (this.direction === 'front') self.player.setTexture(playerSprite.spriteSheet, playerSprite.front);
            }
        }



    }

    applyInput(input, player) {

        // Stop any previous movement from the last frame
        player.body.velocity.x = 0;
        player.body.velocity.y = 0;

        let hitBox = player.list[2];

        // Update velocity & hitBox orientation/dimensions
        if (input.action === 'move_right') {
            player.body.setVelocityX(this.speed);
            hitBox.setPosition(22, 0);
            hitBox.setDisplaySize(40, 60);
        } else if (input.action === 'move_left') {
            player.body.setVelocityX(-this.speed);
            hitBox.setPosition(-22, 0);
            hitBox.setDisplaySize(40, 60);
        } else if (input.action === 'move_up') {
            player.body.setVelocityY(-this.speed);
            hitBox.setPosition(0, -11);
            hitBox.setDisplaySize(60, 35);
        } else if (input.action === 'move_down') {
            player.body.setVelocityY(this.speed);
            hitBox.setPosition(0, 12);
            hitBox.setDisplaySize(85, 40);
        }
    
        /*
        else if (input.action === 'attack') {

        } 
        */
        else {
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
                    self.otherPlayerAnims(otherPlayer, state);

                } else {
                    // Add it to the position buffer.
                    var timestamp = +new Date();
                    otherPlayer.position_buffer.push([timestamp, state.position.x - 11, state.position.y - 15]);

                    // Play walking animations for other player
                    self.otherPlayerAnims(otherPlayer, state);
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

    otherPlayerAnims(otherPlayer, state) {

        // Other player action anims
        if (state.action === 'attack') {
            
            if (state.direction === 'left') {
                otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteSheet}-left-sword`, true);
            } else if (state.direction === 'right') {
                otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteSheet}-right-sword`, true);
            } else if (state.direction === 'back') {
                otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteSheet}-back-sword`, true);
            } else if (state.direction === 'front') {
                otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteSheet}-front-sword`, true);
            }
        }
        
        // Other Player walking anims
        if (state.direction === 'left' && state.velocity.x < 0) {
            otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-left-walk`, true);
        } else if (state.direction === 'right' && state.velocity.x > 0) {
            otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-right-walk`, true);
        } else if (state.direction === 'back' && state.velocity.y < 0) {
            otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-back-walk`, true);
        } else if (state.direction === 'front' && state.velocity.y > 0) {
            otherPlayer.first.anims.play(`${otherPlayer.sprite.spriteNum}-front-walk`, true);
        } 
        
        // If movement stops, set idle frame
        else if (state.action === null) {
            otherPlayer.first.anims.stop();

            if (state.direction === 'left') otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.left);
            else if (state.direction === 'right') otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.right);
            else if (state.direction === 'back') otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.back);
            else if (state.direction === 'front') otherPlayer.first.setTexture(otherPlayer.sprite.spriteSheet, otherPlayer.sprite.front);
        }
    }

    addPlayer(self, playerInfo, worldLayer, map) {

        // create player container for sprite and floating name
        self.playerContainer = self.add.container(playerInfo.position.x, playerInfo.position.y)
        self.playerContainer.setSize(22, 30);
        
        // add player sprite
        self.player = self.physics.add
        .sprite(0, -4, playerSprite.spriteSheet, playerSprite.front)
        .setScale(1)
        self.player.name = playerSprite.spriteSheet;
    
        // add player floating name
        self.playerName = self.add.text(0, -38, `${playerInfo.name}`, {
            font: "14px monospace",
            fill: "#ffffff",
            stroke: '#000000',
            strokeThickness: 3
        })
        .setOrigin(0.5)
        .setColor("#ffffff");

        // add player sprite and name to player container
        self.playerContainer.add(self.player);
        self.playerContainer.add(self.playerName);

        // enable physics for player container
        self.physics.world.enable(self.playerContainer);
        self.playerContainer.body.debugBodyColor = 0xadfefe;
        self.physics.add.collider(self.playerContainer, worldLayer, function() {
            self.playerContainer.isColliding = true;
        });

        // create attack hitBoxes
        this.createPlayerHitboxes(self, self.playerContainer);

        const camera = self.cameras.main;
        camera.startFollow(self.playerContainer);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        camera.visible = true;
        camera.fadeIn(500);

        // create inventory object
        this.createPlayerInventory(self, playerInfo.inventory, playerInfo.coins);

        // create health bar
        let healthBar = self.add.dom(0, -28).createFromCache("healthBar")
            .setDepth(30)
        let healthBarEl = document.getElementById('health_bar')
        healthBarEl.style.display = 'none';
        healthBarEl.id = `health_bar_${client_id}`; // specify health bar id as player id
        self.playerContainer.add(healthBar);

        // update health
        this.updateHealth(playerInfo);

        // debug coordinates
        if (devMode) {
            this.debugCoordinates(self);
        }

        console.log(`spawned ${playerInfo.name} in ${playerInfo.scene}`)

    }

    createPlayerHitboxes(self, playerContainer) {
        let hitBox = self.add.rectangle(0, 12, 85, 40)
        self.physics.world.enable(hitBox);
        hitBox.body.setImmovable(true);
        hitBox.body.debugBodyColor = 0xb21d0a;
        playerContainer.add(hitBox);
    }

    createPlayerInventory(self, inventory, coins) {
        self.inventory = new InventoryManager(self);
        self.inventory.loadItems(inventory, coins);
    }

    addOtherPlayers(self, playerInfo, worldLayer) {

        if (playerInfo.scene !== this.scene) {
            return;
        }
    
        // select a sprite for player based on hash of their username
        let otherPlayerSprite = getUserSprite(playerInfo.name);

        // create other player container for sprite and floating name
        const otherPlayerContainer = self.add.container(playerInfo.position.x, playerInfo.position.y)
        otherPlayerContainer.setSize(22, 30);
        otherPlayerContainer.name = otherPlayerSprite.spriteSheet;

        // add other player sprite
        const otherPlayer = self.physics.add
        .sprite(0, -4, otherPlayerSprite.spriteSheet, otherPlayerSprite.front)
        .setScale(1);

        otherPlayer.playerId = playerInfo.playerId;

        // add other player floating name
        const otherPlayerName = self.add.text(0, -38, `${playerInfo.name}`, {
            font: "14px monospace",
            fill: "#ffffff",
            stroke: '#000000',
            strokeThickness: 3
        })
        .setOrigin(0.5)
        .setColor("#ffffff");

        // add other player sprite and name to player container
        otherPlayerContainer.add(otherPlayer);
        otherPlayerContainer.add(otherPlayerName);
        otherPlayerContainer.sprite = otherPlayerSprite;
        self.physics.world.enable(otherPlayerContainer);
        otherPlayerContainer.body.debugBodyColor = 0xadfefe;
    
        // Watch the other player and worldLayer for collisions
        self.physics.add.collider(otherPlayerContainer, worldLayer);

        // create health bar
        let healthBar = self.add.dom(0, -28).createFromCache("healthBar")
            .setDepth(30)
        let healthBarEl = document.getElementById('health_bar')
        healthBarEl.style.display = 'none';
        healthBarEl.id = `health_bar_${playerInfo.playerId}`; // specify health bar id as player id
        otherPlayerContainer.add(healthBar);

        // update health
        this.updateHealth(playerInfo);

        // listen for other player container colliding with player 1's attacks
        this.listenPlayerAttacks(self, otherPlayerContainer, otherPlayer, playerInfo.playerId);

        // add other player to list of otherplayers
        self.otherPlayers.add(otherPlayerContainer);
        
        otherPlayerContainer.position_buffer = [];
    }

    listenPlayerAttacks(self, otherPlayerContainer, otherPlayerSprite, otherPlayerId) {

        if (!self.allowedActions.attack) {
            return;
        }

        let attackData = {}
        let attackLogged = false;
        
        let hitBox = self.playerContainer.list[2];

        // Listen for overlap between this player's hitbox and the otherPlayer's container
        self.physics.add.overlap(otherPlayerContainer, hitBox, function() {
            
            // Display health bars for both players
            document.getElementById(`health_bar_${socket.id}`).style.display = 'block';
            document.getElementById(`health_bar_${otherPlayerId}`).style.display = 'block';
            
            
            // If player's attack anim hits other player, emit event
            let playerAnim = self.player.anims.getName()
            if (playerAnim.includes(self.player.name) && playerAnim.includes('sword')) {

                let attackFrame = self.player.anims.currentFrame.index;
                if (attackFrame >= 5 && attackFrame < 7) {

                    attackData = {
                        attackerId: socket.id,
                        victimId: otherPlayerId,
                        damage: 5,
                        attackType: 'sword'
                    }
                    
                    if (!attackLogged) {
                        // emit event from other player (so that when other player dies emitter is deleted)
                        otherPlayerContainer.emit('attack', attackData);
                        //console.log(`You attacked ${otherPlayerContainer.name}`)
                    }
                    attackLogged = true;
                }
                if (attackFrame >= 7) {
                    attackLogged = false;
                }
            }
            
        })

        let that = this;
        otherPlayerContainer.on('attack', function (attackData) {
            
            if (attackData.victimId === otherPlayerId) {

                //that.playerDamageAnim(self, otherPlayerSprite);

                // emit attack to server to validate attack
                socket.emit('attack', attackData);

            }
        })

    }

    playerDamageAnim(self, playerSprite) {
        // display damage as red tint on sprite
        self.tweens.addCounter({
            from: 0,
            to: 3,
            duration: 400,
            onUpdate: function (t) {
                let value = t.getValue();

                if (value < 1) {
                    playerSprite.setTint(0xff2b2b, 0xff2b2b, 0xff2b2b, 0xff2b2b)
                }
                else if (value < 2 && value >= 1) {
                    playerSprite.clearTint()
                } else {
                    playerSprite.setTint(0xff2b2b, 0xff2b2b, 0xff2b2b, 0xff2b2b)
                }
            },
            onComplete: function() {
                playerSprite.clearTint()
            }
        });
    }

    updateHealth(playerState, display) {

        let healthBar = document.getElementById(`health_bar_${playerState.playerId}`);

        let healthPercent = String(playerState.health / playerState.maxHealth * 100);
        
        if (healthPercent >= 50) {
            healthBar.children[0].style.backgroundColor = '#03ad00';
        } else if (healthPercent < 50 && healthPercent > 25) {
            healthBar.children[0].style.backgroundColor = 'orange';
        } else {
            healthBar.children[0].style.backgroundColor = 'red';
        }
        
        healthPercent = healthPercent + '%'
        healthBar.children[0].style.width = healthPercent;

        if (display) {
            healthBar.style.display = 'block';
        }

    }

    handleDamage(self, playerState) {

        this.updateHealth(playerState, true)

        // get player sprite
        let playerSprite
        if (playerState.playerId === socket.id) {
            playerSprite = self.player;
        } else {
            // get other player sprite
            for (let p of self.otherPlayers.getChildren()) {
                if (playerState.playerId === p.list[0].playerId )
                    playerSprite = p.list[0];
            }
            
        }

        // play damage anim
        this.playerDamageAnim(self, playerSprite);

        if (playerState.isDead && playerState.playerId === socket.id) {
            // pause player position
            self.playerContainer.body.moves = false;
            const screenCenterX = self.cameras.main.worldView.x + self.cameras.main.width / 2;
            const screenCenterY = self.cameras.main.worldView.y + self.cameras.main.height / 2;

            // hide UI elements
            document.getElementById('inventory_button').style.display = 'none';
            document.getElementById('inventory_container').style.display = 'none';
            document.getElementById('chatBox').style.display = 'none';
            document.getElementById(`health_bar_${playerState.playerId}`).style.visibility = 'hidden';
            for (let p of self.otherPlayers.getChildren()) {
                document.getElementById(`health_bar_${p.list[0].playerId}`).style.visibility = 'hidden';
            }

            // fade out & turn off sockets
            self.cameras.main.fadeOut(2000);
            socket.off();

            // Show 'Game Over' text
            setTimeout(function(){ 
                self.cameras.main.fadeIn(100);
                self.add.rectangle(screenCenterX, screenCenterY, self.cameras.main.width, self.cameras.main.height, 0x000000)
                .setDepth(50);
                self.add.text(screenCenterX, screenCenterY, 'Game Over', {
                    align: 'center',
                    fontSize: 40,
                    fill: 'red'
                })
                .setOrigin(0.5, 0.5)
                .setDepth(55);

                // change scene
                setTimeout(function(){ 
                    let scenes = {
                        new: 'SceneMainBuilding'
                    }
        
                    self.scene.start(scenes.new, self);
                    self.anims.resumeAll();
                    socket.emit("sceneChange", scenes);
                }, 2000);

            }, 2000);
            
        }
    }

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