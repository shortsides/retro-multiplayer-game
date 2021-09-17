const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
    cors: {origin: true}
});

const ROOM_MAX_CAPACITY = 8;
const FRAME_RATE = 10;
let rooms = []; // tracks active rooms on server
let players = []; // tracks players

io.on("connection", client => {

    client.on('playGame', handlePlayGame);

    function handlePlayGame(playerName) {

        const roomName = getRoom();

        const playerNum = getPlayerNum(roomName);

        // optional check for if the number of rooms is finite
        if (playerNum === false) {
            client.emit('serverFull', roomName);
            return;
        }

        // create any new rooms required
        if (rooms.indexOf(roomName) === -1) {
            rooms.push(roomName);
            console.log(`${roomName} was initiated`)
        }

        // set initial state for the new player
        let player = {
            playerId: client.id,
            roomName: roomName,
            name: playerName,
            velocity: {},
            scene: 'SceneMainBuilding',
            init: true,
            position: {
                x: 480,
                y: 625
            },
        };

        // push new player object to players list
        players.push(player);

        client.join(roomName);

        // init the game
        client.emit('init');

        // send the room's state to the new player
        client.emit('currentPlayers', players);

        // update all other players of the new player
        io.sockets.in(roomName).emit('newPlayer', player);
        console.log(`${playerName} has joined ${roomName}`);
        player.init = false;

        //startGameInterval(roomName);

        // remove player on disconnect
        client.on("disconnect", () => {

            console.log(`${playerName} has disconnected`)

            // delete player from room;
            players = players.filter(player => player.playerId !== client.id);

            // shut down room if empty
            shutDownRoom(roomName); 
            io.sockets.in(roomName).emit('disconnectPlayer', player);
        })


        // when a player moves, update the player state
        client.on("playerMovement", function (movementData) {

            for (let p of players) {
                if (p.playerId === client.id) {
                    // update server's record of player movement
                    p.velocity = movementData.velocity;
                    p.position = movementData.position;
                    // emit to all players that the player moved
                    io.sockets.in(roomName).emit('playerMoved', p);
                    return;
                }
            }

        })

        // when a player changes scene, update the players
        client.on("sceneChange", function (newScene) {
            
            for (let p of players) {
                if (p.playerId === client.id) {
                    console.log(`${p.name} is moving to ${newScene}`)

                    // update player position for new scene
                    p.velocity = {};
                    p.position = {
                        x: 210,
                        y: 288
                    };

                    // emit to all players that the player moved
                    io.sockets.in(roomName).emit('playerChangedScene', p);

                    // wait 500ms to give the client time to load new scene
                    setTimeout(function () {
                        
                        // update player scene
                        p.scene = newScene;

                        // emit current players so new scene can be initialised
                        client.emit('currentPlayers', players);

                        io.sockets.in(roomName).emit('newPlayer', p);

                    }, 500);

                    return;
                }
            }
        })

        // when a player sends a chat message, emit it to players
        client.on("message", function (message) {
            io.sockets.in(roomName).emit('message', message);
        })

    }

});

// Gets the next available room, or creates one if none available
function getRoom() {

    let roomNum = 1;
    
    for (let room of rooms) {

        let playersInRoom = getPlayerNum(`World ${roomNum}`);

        // if room is full, check next room
        if (!playersInRoom) {
            roomNum++;
        }

    }

    const roomName = `World ${roomNum}`;

    return roomName;

}

// Gets the number of players in the room, but returns false if the room is full
function getPlayerNum(roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);

    if (room) {

        const playerNum = room.size + 1;

        if (playerNum > ROOM_MAX_CAPACITY) {
            return false;
        } 
        
        return playerNum;
    }

    return 1; // if no room exists then the first playerNum should be 1

}

// Shuts down room if no players
function shutDownRoom(roomName) {

    let playersInRoom = getPlayerNum(roomName);

    if (playersInRoom < 2) {
        delete rooms[roomName];
        console.log(`${roomName} was shut down`);
        return;
    }

}

/*
// Start game ticker if there are players in room
function startGameInterval(roomName) {

    const intervalId = setInterval(() => {

        // if no players in room, don't start interval
        if (getPlayerNum(roomName) < 2) {
            clearInterval(intervalId);
            return;
        }

        emitGameState(roomName, players);

    }, 1000 / FRAME_RATE);
}

// Broadcast current player states to all players in room
function emitGameState(roomName, state) {
    io.sockets.in(roomName).emit('gameState', state);
}
*/

httpServer.listen(process.env.PORT || 3000);