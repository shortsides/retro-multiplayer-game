import * as http from 'http';
import * as socket_io from 'socket.io';

import WorldController from './world_server.js';


function Main() {
    const port = process.env.PORT || 3000;
  
    const server = http.createServer();
    const io = new socket_io.Server(server, {
        cors: {
            origin: true
        }
    });
  
    server.listen(port, () => {
      console.log('listening on: *', port);
    });

    const ROOM_MAX_CAPACITY = 8;

    let rooms = []; // tracks active rooms/worlds on server

    io.on("connection", client => {

        // only start world after player logs in
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
            let world;
            if (rooms.length === 0) {
                world = new WorldController(io, roomName);
                rooms.push(world);
                console.log(`${roomName} was initiated`)
            } else {
                Object.keys(rooms).forEach(function (i) {
                    if (rooms[i].roomName === roomName) {
                        world = rooms[i];
                    } else {
                        world = new WorldController(io, roomName);
                        rooms.push(world);
                        console.log(`${roomName} was initiated`)
                    }
                });
            }
            
            world.playerJoin(playerName, client);

    
            // remove player on disconnect
            client.on("disconnect", () => {
    
                console.log(`${playerName} has disconnected`)
    
                // delete player from room;
                world.disconnectPlayer(client.id);
                io.sockets.in(roomName).emit('disconnectPlayer', client.id, playerName);
    
                // shut down room if empty
                shutDownRoom(roomName);
            })
        
        }
    
    });


    // Gets the next available room, or creates one if none available
    function getRoom() {

        let roomNum = 1;
        
        for (let i = 0; i < rooms.length; i++) {

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
            //delete rooms[roomName];

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




