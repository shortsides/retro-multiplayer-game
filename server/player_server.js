import { SCENES } from "./world_server.js";

export default class PlayerController {

    constructor(client, world) {
        this.client_io = client;
        this.world = world;

        this.state = this.initPlayerState();
        
        this.setupSockets();

        // NEW
        this.setUpdateRate(10);
        this.last_processed_input = [];
        this.messages = [];
        this.speed = 170;
        this.lag_ms = 0;

        // OLD
        //this.setUpdateRate(0.25);
    }


    setupSockets() {

        // NEW MOVEMENT LOGIC
        this.client_io.on("playerMoved", input => {

            this.messages.push({
                recv_ts: +new Date() + input.lag_ms,
                payload: input
            });

            this.lag_ms = input.lag_ms;

        })

        // OLD MOVEMENT LOGIC
        this.client_io.on("playerMovement", movementData => {
            this.movePlayer(movementData);
        });
        // ---------------------------------------------------

        this.client_io.on("sceneChange", scenes => {
            this.changeScene(scenes);
        })

        this.client_io.on("message", message => {
            this.handleChatMessage(message);
        })

        this.client_io.on("inventory", items => {
            this.updateInventory(items);
        })

        this.client_io.on("updateCoins", coins => {
            this.updateCoins(coins);
        })
    }


    // ------------------------------ NEW PLAYER-SERVER MOVEMENT LOGIC ------------------------------

    setUpdateRate(hz) {
        this.update_rate = hz;
      
        clearInterval(this.update_interval);
        this.update_interval = setInterval(
            (function(self) { return function() { self.update(); }; })(this),
            1000 / this.update_rate);
    }

    update() {
        this.processInputs();
        this.sendPlayerState();
    }

    validateInput(input) {
        if (Math.abs(input.press_time) > 1/40) {
            console.log('input invalid');
            return false;
        }
        return true;
    }

    processInputs() {
        // Process all pending messages from clients.
        while (true) {
            var message = this.receive();
            if (!message) {
                break;
            }
            
            // Update the state of the entity, based on its input.
            // We just ignore inputs that don't look valid; this is what prevents clients from cheating.
            if (this.validateInput(message)) {
                this.applyInput(message);
                this.last_processed_input = message.input_sequence_number;
            }
      
        }
      
        // Show some info.
        var info = "Last acknowledged input: ";
        info += (this.last_processed_input || 0) + "   ";
        //console.log(info);
    }

    applyInput (input) {

        if (input.action === 'move_right') {
            this.state.position.x += input.press_time*this.speed;
            this.state.velocity.x = this.speed;
            this.state.sprite = 'right';
        } else if (input.action === 'move_left') {
            this.state.position.x += -input.press_time*this.speed;
            this.state.velocity.x = -this.speed;
            this.state.sprite = 'left';
        } else if (input.action === 'move_up') {
            this.state.position.y += -input.press_time*this.speed;
            this.state.velocity.y = -this.speed;
            this.state.sprite = 'back';
        } else if (input.action === 'move_down') {
            this.state.position.y += input.press_time*this.speed;
            this.state.velocity.y = this.speed;
            this.state.sprite = 'front';
        } else if (input.action === 'stop') {
            this.state.velocity.x = 0;
            this.state.velocity.y = 0;
        } else {
            return;
        }
    }

    sendPlayerState() {
        let state = [];
        state.push({
            entity_id: this.state.playerId,
            position: this.state.position,
            velocity: this.state.velocity,
            sprite: this.state.sprite,
            last_processed_input: this.last_processed_input
        });
        
        let data = {
            recv_ts: +new Date() + this.lag_ms,
            payload: state
        }

        this.world.io.sockets.in(this.world.roomName).emit('playerMoved', data);
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


    // ------------------------------ OLD MOVEMENT LOGIC ---------------------------------------------------
    /*
    movePlayer(movementData) {
        this.state.velocity = movementData.velocity;
        this.state.position = movementData.position;
        // emit new player state to all players
        this.world.io.sockets.in(this.world.roomName).emit('otherPlayerMoved', this.state);
    }

    setUpdateRate(hz) {
        this.update_rate = hz;
      
        clearInterval(this.update_interval);

        let self = this;
        this.update_interval = setInterval(() => {
            self.sendPlayerState();
        }, 1000 / this.update_rate);
    }

    sendPlayerState() {
        // Broadcast the player state to all the clients.
        this.world.io.sockets.in(this.world.roomName).emit('otherPlayerMoved', this.state, 'ticker');
    }
    */


    changeScene(scenes) {

        this.messages = []; // reset movement messages

        // get new scene details e.g. starting position
        var scenesCopy = JSON.parse(JSON.stringify(SCENES)); // make deep copy of SCENES
        let scene;
        let newPos;
        for (let s of scenesCopy) {
            if (s.name === scenes.new) {
                scene = s;
                if (scenes.old) {
                    for (let e of s.altEntrances) {
                        if (e.from === scenes.old) {
                            newPos = e;
                        }
                    }
                } else {
                    newPos = scene.position;
                }
            }
        }

        console.log(`${this.client_io.name} is moving to ${scenes.new}`)
        
        this.state.velocity = {}; // reset velocity
        this.state.position = newPos; // update player position for new scene

        // emit to all players that the player moved
        this.world.io.sockets.in(this.world.roomName).emit('playerChangedScene', this.state);

        let self = this;

        // wait 500ms to give the client time to load new scene
        setTimeout( () => {
            
            // update player scene
            self.state.scene = scenes.new;

            // emit current players so new scene can be initialised
            self.client_io.emit('currentPlayers', self.world.players);

            self.world.io.sockets.in(self.world.roomName).emit('newPlayer', self.state);

        }, 500);

    }

    
    // when a player sends a chat message, emit it to players
    handleChatMessage(message) {
        this.world.io.sockets.in(this.world.roomName).emit('message', message);
    }


    // when a player's inventory state changes, update inventory
    updateInventory(items) {
        this.state.inventory = items;
    }

    // add new coins (e.g. from minigame) to player's coins
    updateCoins(coins) {
        this.state.coins += coins;
    }

    // create player's empty inventory slots
    createInventorySlots(inventorySize) {
        let inventory = [];
        for (let i = 0; i < inventorySize; i++) {
            let item = {};
            item.slot = i + 1;
            item.available = true;
            inventory.push(item)
        }
        return inventory;
      }


    // set initial state for player - spawn player in main building
    initPlayerState() {
        return {
            playerId: this.client_io.id,
            roomName: this.world.roomName,
            name: this.client_io.name,
            velocity: {
                x: 0,
                y: 0,
            },
            scene: 'SceneMainBuilding',
            init: true,
            position: {
                x: 480,
                y: 625
            },
            sprite: 'front',
            inventory: this.createInventorySlots(20),
            coins: 0
        }
    }

}
