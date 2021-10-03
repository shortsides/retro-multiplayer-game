import * as http from 'http';
import * as socket_io from 'socket.io';

import WorldController from './world_server.js';


function Main() {
    const port = process.env.PORT || 3000;
  
    const server = http.createServer();
    
    // production server config
    
    const io = new socket_io.Server(server, {
        cors: {
            origin: "https://confident-wing-1924d2.netlify.app",
            credentials: true
        }
    });
    
    /*
    // local testing config
    
    const io = new socket_io.Server(server, {
        cors: {
            origin: "*"
        }
    });
    */
    
    server.listen(port, () => {
      console.log('listening on: *', port);
    });

    const ROOM_MAX_CAPACITY = 8;

    let worlds = []; // tracks active world rooms on server
    let world; // world the current player/client is in
    let roomName;

    io.on("connection", client => {

        console.log(`client ${client.id} connected`);

        client.on('login', handleLogin)
        client.on('playGame', handlePlayGame); // only start world after player logs in
        
        function handleLogin(playerName) {

            roomName = getRoom(worlds, 'World', ROOM_MAX_CAPACITY);
    
            const playerNum = getPlayerNum(roomName, ROOM_MAX_CAPACITY);
    
            // optional check for if the number of rooms is finite
            if (playerNum === false) {
                console.log('server full');
                client.emit('serverFull', roomName);
                return;
            }

            // create any new rooms required
            let nameAvailable = true;
            if (worlds.length === 0) {
                world = new WorldController(io, roomName);
                worlds.push(world);
                console.log(`${roomName} was initiated`)
            } else {
                Object.keys(worlds).every(function (i) {
                    if (worlds[i].roomName === roomName) {
                        world = worlds[i];
                        nameAvailable = checkPlayerName(playerName, world);
                        if (!nameAvailable) {
                            return false;
                        }
                    } else {
                        world = new WorldController(io, roomName);
                        worlds.push(world);
                        console.log(`${roomName} was initiated`)
                    }
                });
            }
            if (nameAvailable === false) {
                client.emit('nameTaken');
                return;
            }

            client.name = playerName;
            
            client.emit('loginSuccess')
            
        }
    
        function handlePlayGame(playerName) {

            world.playerJoin(client);

            // handle minigames
            client.on("joinMiniGame", miniGameName => {
                setTimeout(() => { 
                    world.joinMiniGame(miniGameName, client, playerName);
                }, 500);
                
            })

    
            // remove player on disconnect
            client.on("disconnect", () => {
    
                console.log(`${playerName} has disconnected`)
    
                // delete player from room;
                world.disconnectPlayer(client);
                io.sockets.in(roomName).emit('disconnectPlayer', client.id, playerName);
    
                // shut down room if empty
                shutDownRoom(roomName, worlds, ROOM_MAX_CAPACITY);
            })
        
        }
    
    });


    // Gets the next available room, or creates one if none available
    function getRoom(rooms, type, maxCapacity) {

        let roomNum = 1;
        
        for (let i = 0; i < rooms.length; i++) {

            let playersInRoom = getPlayerNum(`${type} ${roomNum}`, maxCapacity);

            // if room is full, check next room
            if (!playersInRoom) {
                roomNum++;
            }

        }

        const roomName = `${type} ${roomNum}`;

        return roomName;

    }

    // Gets the number of players in the room, but returns false if the room is full
    function getPlayerNum(roomName, maxCapacity) {
        const room = io.sockets.adapter.rooms.get(roomName);

        if (room) {

            const playerNum = room.size + 1;

            if (playerNum > maxCapacity) {
                return false;
            } 
            
            return playerNum;
        }

        return 1; // if no room exists then the first playerNum should be 1

    }

    // Checks if player username is not already taken
    function checkPlayerName(playerName, playerWorld) {
        for (let p of playerWorld.players) {
            if (p.name === playerName) {
                return false;
            }
        }
    }

    // Shuts down room if no players
    function shutDownRoom(roomName, rooms, maxCapacity) {

        let playersInRoom = getPlayerNum(roomName, maxCapacity);

        if (playersInRoom < 2) {

            for (let room of rooms) {
                if (room.roomName === roomName) {
                    rooms.splice(rooms.indexOf(room), 1);
                }
            };

            console.log(`${roomName} was shut down`);
            return;
        }

    }


}


Main();




