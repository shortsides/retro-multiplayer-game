import { SCENES } from "./world_server.js";

export default class PlayerController {

    constructor(client, world) {
        this.client_io = client;
        this.world = world;

        this.messages = [];

        this.state = this.initPlayerState();
        
        this.setupSockets();

        this.setUpdateRate(0.25);
    }


    setupSockets() {

        this.client_io.on("playerMovement", movementData => {

            // SIMULATE SERVER LAG
            //------------------------------------------------------------------------
            /*
            let self = this;
            let timeout = Math.random() * 300;
            setTimeout(function(){ 
                self.movePlayer(movementData); 

                //self.messages.push[movementData]

            }, timeout);
            */
            //------------------------------------------------------------------------

            this.movePlayer(movementData);
            
        });

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
        this.world.io.sockets.in(this.world.roomName).emit('playerMoved', this.state, 'ticker');
    }


    // when a player moves, update the player velocity & position
    movePlayer(movementData) {
        this.state.velocity = movementData.velocity;
        this.state.position = movementData.position;
        // emit new player state to all players
        this.world.io.sockets.in(this.world.roomName).emit('playerMoved', this.state);
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

        // get new scene details e.g. starting position
        let scene;
        let newPos;
        for (let s of SCENES) {
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
            velocity: {},
            scene: 'SceneMainBuilding',
            init: true,
            position: {
                x: 480,
                y: 625
            },
            inventory: this.createInventorySlots(20),
            coins: 0
        }
    }

}
