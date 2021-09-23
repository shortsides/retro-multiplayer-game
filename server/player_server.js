import { SCENES } from "./world_server.js";

export default class PlayerController {

    constructor(client, playerName, world) {
        this.client_io = client;
        this.playerName = playerName;
        this.world = world;

        this.state = this.initPlayerState();
        
        this.setupSockets();
    }


    setupSockets() {

        this.client_io.on("playerMovement", movementData => {
            this.movePlayer(movementData);
        });

        this.client_io.on("sceneChange", scenes => {
            this.changeScene(scenes);
        })

        this.client_io.on("message", message => {
            this.handleChatMessage(message);
        })
    }


    // when a player moves, update the player velocity & position
    movePlayer(movementData) {
            this.state.velocity = movementData.velocity;
            this.state.position = movementData.position;
            // emit new player state to all players
            this.world.io.sockets.in(this.world.roomName).emit('playerMoved', this.state);
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

        console.log(`${this.playerName} is moving to ${scenes.new}`)
        
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


    // set initial state for player - spawn player in main building
    initPlayerState() {
        return {
            playerId: this.client_io.id,
            roomName: this.world.roomName,
            name: this.playerName,
            velocity: {},
            scene: 'SceneMainBuilding',
            init: true,
            position: {
                x: 480,
                y: 625
            },
        }
    }

}