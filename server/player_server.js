import { SCENES } from "./world_server.js";

export default class PlayerController {

    constructor(client, world) {
        this.client_io = client;
        this.world = world;

        this.state = this.initPlayerState();
        
        this.setupSockets();

        this.setUpdateRate(10);
        this.last_processed_input = [];
        this.messages = [];
        this.speed = 140;
        this.lag_ms = 0;

    }


    setupSockets() {

        this.client_io.on("playerMoved", input => {

            this.messages.push({
                recv_ts: +new Date() + input.lag_ms,
                payload: input
            });
            // Simulate server lag for testing
            this.lag_ms = input.lag_ms;

        })

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

        this.client_io.on("objRemovedFromScene", obj => {
            this.trackObjState(obj);
        })

        this.client_io.on("endTutorial", data => {
            this.endTutorial(data);
        })

        this.client_io.on("acceptQuest", quest => {
            this.acceptQuest(quest);
        })

        this.client_io.on("endQuest", quest => {
            this.endQuest(quest);
        })

    }


    // ------------------------------ PLAYER-SERVER MOVEMENT LOGIC ------------------------------

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
            //console.log('input invalid');
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


        // Apply movement
        if (input.action === 'move_right') {
            //this.state.position.x += input.press_time*this.speed;
            this.state.position.x = input.position.x + 11;
            this.state.velocity.x = this.speed;
            this.state.direction = 'right';
            this.state.action = null;
        } else if (input.action === 'move_left') {
            //this.state.position.x += -input.press_time*this.speed;
            this.state.position.x = input.position.x + 11;
            this.state.velocity.x = -this.speed;
            this.state.direction = 'left';
            this.state.action = null;
        } else if (input.action === 'move_up') {
            //this.state.position.y += -input.press_time*this.speed;
            this.state.position.y = input.position.y + 15;
            this.state.velocity.y = -this.speed;
            this.state.direction = 'back';
            this.state.action = null;
        } else if (input.action === 'move_down') {
            //this.state.position.y += input.press_time*this.speed;
            this.state.position.y = input.position.y + 15;
            this.state.velocity.y = this.speed;
            this.state.direction = 'front';
            this.state.action = null;
        } else if (input.action === 'stop') {
            this.state.velocity.x = 0;
            this.state.velocity.y = 0;
            this.state.action = null;
        }
        // Apply actions
        else if (input.action === 'attack') {
            this.state.action = 'attack';
            this.state.velocity.x = 0;
            this.state.velocity.y = 0;
            return;
        }
        else {
            this.state.action = null;
            return;
        }
    }

    sendPlayerState() {
        let state = [];
        state.push({
            entity_id: this.state.playerId,
            position: this.state.position,
            velocity: this.state.velocity,
            direction: this.state.direction,
            action: this.state.action,
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

        // check if player is dead i.e. respawning & reset health
        if (this.state.isDead) {
            this.state.isDead = false;
            this.state.health = this.state.maxHealth;
        }

        console.log(`${this.client_io.name} is moving to ${scenes.new}`)
        
        this.state.velocity = {}; // reset velocity
        this.state.position = newPos; // update player position for new scene
        this.state.direction = 'front'; // reset direction

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


    // keep track of objects that should be removed from scenes
    trackObjState(obj) {
        let newObj = {
            name: obj,
            visible: false
        }
        this.state.objects.push(newObj);
    }


    // when a player's inventory state changes, update inventory
    updateInventory(items) {
        this.state.inventory = items;
        this.checkInventory(); 
    }

    checkInventory() {

        // check if player has sword
        for (let i of this.state.inventory) {
            if (i.available) {
                continue;
            }
            if (i.props.class === 'sword') {
                this.state.swordEquipped = true;
                console.log(`sword equipped by ${this.name}`);
                this.client_io.emit('swordEquipped', true);
                return;
            }
        }
        this.client_io.emit('swordEquipped', false);
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

    endTutorial() {
        this.state.tutorial = false;
    }

    acceptQuest(quest) {
        console.log(`${this.state.name} started quest ${quest.name}`)
        this.state.quests.push(quest);
        this.client_io.emit('refreshQuestData', this.state.quests);
    }

    endQuest(quest) {
        // update quest data
        for (let q of this.state.quests) {
            if (q.id === quest.id) {
                q.completed = true;
            }
        }

        this.client_io.emit('refreshQuestData', this.state.quests);
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
            direction: 'front',
            action: null,
            isDead: false,
            health: 25,
            maxHealth: 25,
            inventory: this.createInventorySlots(20),
            objects: [],
            tutorial: true,
            quests: [],
            coins: 0,
            swordEquipped: false
        }
    }

}
