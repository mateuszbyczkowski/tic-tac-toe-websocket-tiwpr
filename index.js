const express = require('express');
const path = require('path');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const gameStates = {
    NOT_STARTED: 0,
    STARTED: 1
};

const rooms = [];

app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

io.on('connection', (socket) => {
    //return first client socketId
    socket.on('returnMySocketId', ({}) => {
        socket.emit('mySocketId', socket.id);
    });

    //check whether this player is already in any room/game that is not finished
    //we use for it one old socketId. because every new connection creates new socket
    socket.on('areWeInGame', (socketId) => {
        //if there is any game started
        if (rooms.length > 0) {
            //check whether this socketId is in any room
            for (let i = 0; i < rooms.length; i++) {
                //if it's true join to this room and recall state instead of creating new
                if (socketId === rooms[i].players[0].socketId
                    || socketId === rooms[i].players[1].socketId) {
                    //join again to room and set socketId to new socketId
                    socket.join(rooms[i].roomName);
                    socket.emit('recallBoardState', rooms[i]);
                    console.log('Old socket connected, let\'s back to the game');
                }
            }
        }
        console.log('No rooms, let\'s create a new game');
    });

    //create a new game room and notify the creator of game.
    socket.on('createGame', (data) => {
        //create room and push it to rooms array to let users rejoin it later
        const newRoom = {
            roomName: 'room-' + rooms.length,
            roomNumber: rooms.length,
            players: [{socketId: data.socketId, name: data.name}],
            state: gameStates.NOT_STARTED
        };
        rooms.push(newRoom);

        socket.join(newRoom.roomName);
        socket.emit('newGame', {name: data.name, room: newRoom.roomName});
    });

    //connect Player 2 to the room. Show error if room full.
    socket.on('joinGame', function (data) {
        let room = io.nsps['/'].adapter.rooms[data.room];
        if (room && room.length === 1) {
            //add joining player to existing room object and set game on started
            rooms.forEach(room => {
                if (room.roomName === data.room) {
                    room.players.push({socketId: data.socketId, name: data.name})
                    room.state = gameStates.STARTED;
                }
            });

            //join new player to room and broadcast roles
            socket.join(data.room);
            socket.broadcast.to(data.room).emit('player1', {});
            socket.emit('player2', {name: data.name, room: data.room})
        } else {
            socket.emit('err', {message: 'Sorry, The room is full!'});
        }
    });

    socket.on('playTurn', (data) => {
        socket.broadcast.to(data.room).emit('turnPlayed', {
            squares: data.squares,
            score: data.score,
            room: data.room,
            paints: data.paints
        });
    });

    socket.on('gameEnded', (data) => {
        //searching for room and remove it from rooms array
        for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].roomName === data.room) {
                socket.broadcast.to(data.room).emit('gameEnd', data);
                rooms.splice(i, 1);
            } else {
                console.log('Room ' + data.room + ' is not existing or already closed.')
            }
        }
    });
});

server.listen(process.env.PORT || 5000);
