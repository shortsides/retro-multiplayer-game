import PlayerController from "./player_server.js";

export const SCENES = [
    {
        name: 'SceneMainBuilding',
        position: {
            x: 480,
            y: 625
        },
        altEntrances: [
            {
                from: 'SceneMainBuildingBasement',
                x: 470,
                y: 367
            },
            {
                from: 'SceneMainBuildingFirstFloor',
                x: 517,
                y: 367
            }
        ]
    },
    {
        name: 'SceneMainBuildingBasement',
        position: {
            x: 400,
            y: 375
        },
        altEntrances: [
            {
                from: 'MiniGameSnake',
                x: 340,
                y: 535
            }
        ]
    },
    {
        name: 'SceneWorld',
        position: {
            x: 1167,
            y: 613
        }
    }
]

export default class WorldController {

        constructor(io, roomName) {
            this.io = io;
            this.roomName = roomName;
            this.players = [];
        }


        playerJoin(playerName, client_io) {
            let player = new PlayerController(client_io, playerName, this)
            this.players.push(player.state);
            client_io.join(this.roomName);

            // send the room's state to the new player
            client_io.emit('currentPlayers', this.players);

            // update all other players of the new player
            this.io.sockets.in(this.roomName).emit('newPlayer', player.state);
            console.log(`${playerName} has joined ${this.roomName}`);
            player.state.init = false;
        }

        
        disconnectPlayer(client_id) {
            for (let player of this.players) {
                if (player.playerId === client_id) {
                    this.players.splice(this.players.indexOf(player), 1);
                }
            };
        }


        startGameInterval() {

        }


}
