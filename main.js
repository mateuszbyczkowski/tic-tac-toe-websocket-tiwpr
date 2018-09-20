(function startGame() {
    const P1 = 'X';
    const P2 = 'O';
    const GRID_THICKNESS = 5;
    const SOCKET = io.connect('http://localhost:5000');
    let player, game;
    let board, boardContext;
    let squares = [];
    let score = {'X': 0, 'O': 0};

    class Player {
        constructor(name, type) {
            this.name = name;
            this.type = type;
            this.currentTurn = true;
        }

        setCurrentTurn(turn) {
            this.currentTurn = turn;
            const message = turn ? 'Your turn' : 'Opponent\'s turn';
            $('#turn').text(message);
        }

        getPlayerName() {
            return this.name;
        }

        getPlayerType() {
            return this.type;
        }

        getCurrentTurn() {
            return this.currentTurn;
        }
    }

    class Game {
        constructor(roomId) {
            this.roomId = roomId;
            this.tied = false;
            this.winsNumbers = [7, 56, 448, 73, 146, 292, 273, 84];
        }

        // Remove the menu from DOM, display the gameboard and greet the player.
        displayBoard(message) {
            $('.container').css('display', 'none');
            $('.gameBoard').css('display', 'block');
            $('#userHello').html(message);
            this.createGameBoard();
        }

        createGameBoard() {
            this.setCanvasBoard();
            //Set whole square array with powers of 2 (beginning with 1) and set their coordinates
            let indicator = 1;
            let y = 0;

            for (let i = 0; i < 3; i += 1) {
                let x = 0;
                for (let j = 0; j < 3; j += 1) {
                    squares.push({x: x, y: y, indicator: indicator});
                    indicator += indicator;
                    x += board.width / 3;
                }
                y += board.height / 3;
            }

            document.getElementById('tic-tac-toe').appendChild(board);

            for (let i = 0; i < squares.length; i += 1) {
                squares[i].paint = squarePainters['\xA0'];
            }
            drawTicTacToeBoard();
        }

        setCanvasBoard() {
            board = document.createElement('canvas');
            board.innerHTML = "This game works only on web browsers that supports the canvas tag!";
            board.width = 175;
            board.height = 175;
            board.onclick = setCanvasListener;
            boardContext = board.getContext("2d");
        }

        getRoomId() {
            return this.roomId;
        }

        announceWinner() {
            const message = `${player.getPlayerName()} wins!`;
            SOCKET.emit('gameEnded', {
                room: this.getRoomId(),
                message,
            });
            alert(message);
            $('#exit').css('display', 'block');
            board.onclick = null;
        }

        checkForTie(paints) {
            let count = 0;
            for (let k = 0; k < paints.length; k++) {
                if (paints[k] === "X" || paints[k] === "O") {
                    count++;
                }
            }
            if (count === 8) {
                this.tied = true;
            }
        }

        endGame(message) {
            alert(message);
            $('#exit').css('display', 'block');
            board.onclick = null;
        }
    }

    /**
     *  BEGIN HELPERS
     */
    const setCanvasListener = function (event) {
        if (!player.getCurrentTurn() || !game) {
            alert('Its not your turn!');
            return;
        }

        let location = getCursorPosition(event);
        let square = getSquare(location.x, location.y);
        if (square) {
            if (square.paint !== squarePainters['\xA0']) {
                return;
            }
            squarePainters['\xA0'](square.x, square.y);
            boardContext.save();
            squarePainters[player.getPlayerType()](square.x, square.y);
            boardContext.restore();
            finishTurn(square);
        }
    };

    const finishTurn = function (square) {
        square.paint = squarePainters[player.getPlayerType()];
        drawTicTacToeBoard();
        checkForWin(square);

        SOCKET.emit('playTurn', {
            squares: squares,
            score: score,
            room: game.getRoomId(),
            paints: squares.map(square => square.paint.name)
        });

        player.setCurrentTurn(false);
        board.onclick = setCanvasListener;
    };

    const checkForWin = function (square) {
        score[player.getPlayerType()] += square.indicator;
        if (win(score[player.getPlayerType()])) {
            game.announceWinner();
        } else if (game.tied) {
            alert("TIE!");
            $('#exit').css('display', 'block');
            board.onclick = null;
            SOCKET.emit('gameEnded', {
                room: game.getRoomId(),
                message: 'Game tied!',
            });
        }
    };

    const win = function (score) {
        for (let i = 0; i < game.winsNumbers.length; i += 1) {
            if ((game.winsNumbers[i] & score) === game.winsNumbers[i]) {
                return true;
            }
        }
        return false;
    };

    const squarePainters = {
        '\xA0': function (x, y) {
            boardContext.clearRect(x + GRID_THICKNESS, y + GRID_THICKNESS,
                (board.width / 3) - (GRID_THICKNESS << 1),
                (board.height / 3) - (GRID_THICKNESS << 1));
        },

        'X': function (x, y) {
            boardContext.save();
            boardContext.lineWidth = 5;
            boardContext.strokeStyle = "rgb(0, 0, 120)";

            let cellWidth = board.width / 3 - (GRID_THICKNESS << 1),
                cellHeight = board.height / 3 - (GRID_THICKNESS << 1),
                side = Math.min(cellWidth, cellHeight),
                xCorner = side >> 2,
                xSize = side * 3 >> 2;

            boardContext.translate(x, y);
            boardContext.beginPath();
            boardContext.moveTo(xCorner, xCorner);
            boardContext.lineTo(xCorner + xSize, xCorner + xSize);
            boardContext.moveTo(xCorner, xCorner + xSize);
            boardContext.lineTo(xCorner + xSize, xCorner);
            boardContext.stroke();
            boardContext.restore();
        },

        'O': function (x, y) {
            boardContext.save();
            boardContext.lineWidth = 4;
            boardContext.strokeStyle = "rgb(0, 120, 0)";

            let cellWidth = board.width / 3 - (GRID_THICKNESS << 1),
                cellHeight = board.height / 3 - (GRID_THICKNESS << 1),
                radius = Math.min(cellWidth, cellHeight) * 3 >> 3;

            boardContext.translate(x + GRID_THICKNESS + (cellWidth >> 1),
                y + GRID_THICKNESS + (cellHeight >> 1));
            boardContext.beginPath();
            boardContext.arc(0, 0, radius, 0, 2 * Math.PI, false);
            boardContext.stroke();
            boardContext.restore();
        }
    };

    const drawTicTacToeBoard = function () {
        boardContext.clearRect(0, 0, board.width, board.height);
        drawTicTacToeGrid();
        drawSquares();
    };

    const drawTicTacToeGrid = function () {
        boardContext.save();
        boardContext.lineWidth = GRID_THICKNESS;
        boardContext.lineCap = "round";

        boardContext.save();
        boardContext.translate(board.width / 3, 0);
        drawGridLine();
        boardContext.translate(board.width / 3, 0);
        drawGridLine();
        boardContext.restore();

        boardContext.save();
        boardContext.translate(board.width, board.height / 3);
        boardContext.rotate(Math.PI / 2);
        drawGridLine();
        boardContext.translate(board.height / 3, 0);
        drawGridLine();
        boardContext.restore();

        // This restore pairs up with the very first save.
        boardContext.restore();
    };

    const drawSquares = function () {
        for (let i = 0; i < squares.length; i += 1) {
            squares[i].paint(squares[i].x, squares[i].y);
        }
    };

    const drawGridLine = function () {
        boardContext.save();
        boardContext.strokeStyle = 'Maroon';
        boardContext.beginPath();
        boardContext.moveTo(0, boardContext.lineWidth);
        boardContext.lineTo(0, board.height - boardContext.lineWidth);
        boardContext.stroke();
        boardContext.restore();
    };

    const getSquare = function (x, y) {
        let cellWidth = board.width / 3;
        let cellHeight = board.height / 3;
        for (let i = 0; i < squares.length; i += 1) {
            if ((x > squares[i].x) && (x < squares[i].x + cellWidth) &&
                (y > squares[i].y) && (y < squares[i].y + cellHeight)) {
                return squares[i];
            }
        }
        return null;
    };

    const getCursorPosition = function (event) {
        let x, y;
        if (event.pageX || event.pageY) {
            x = event.pageX;
            y = event.pageY;
        } else {
            x = event.clientX + document.body.scrollLeft +
                document.documentElement.scrollLeft;
            y = event.clientY + document.body.scrollTop +
                document.documentElement.scrollTop;
        }
        x -= board.offsetLeft;
        y -= board.offsetTop;

        return {'x': x, 'y': y};
    };

    /**
     *  BEGIN SOCKET EVENTS
     */
    // Create a new game. Emit newGame event.
    $('#new').on('click', () => {
        const name = $('#nameNew').val();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        SOCKET.emit('createGame', {name});
        player = new Player(name, P1);
    });

    $('#exit').on('click', () => {
        location.reload();
    });

    // Join an existing game on the entered roomId. Emit the joinGame event.
    $('#join').on('click', () => {
        const name = $('#nameJoin').val();
        const roomID = $('#room').val();
        if (!name || !roomID) {
            alert('Please enter your name and game ID.');
            return;
        }
        SOCKET.emit('joinGame', {name, room: roomID});
        player = new Player(name, P2);
    });

    // New Game created by current client. Update the UI and create new Game var.
    SOCKET.on('newGame', (data) => {
        const message =
            `Hello, ${data.name}. \nPlease ask your friend to enter Game ID: 
      ${data.room}. Waiting for player 2...`;

        // Create game for player 1
        game = new Game(data.room);
        game.displayBoard(message);
    });

    SOCKET.on('player1', (data) => {
        const message = `Hello, ${player.getPlayerName()}`;
        $('#userHello').html(message);
        player.setCurrentTurn(true);
    });

    SOCKET.on('player2', (data) => {
        const message = `Hello, ${data.name}`;

        // Create game for player 2
        game = new Game(data.room);
        game.displayBoard(message);
        player.setCurrentTurn(false);
    });

    SOCKET.on('turnPlayed', (data) => {
        squares = data.squares;
        score = data.score;
        let paints = data.paints;

        for (let i = 0; i < squares.length; i++) {
            squares[i].paint = squarePainters[paints[i]];
        }

        game.checkForTie(paints);
        drawTicTacToeBoard();
        player.setCurrentTurn(true);

        console.log('Turn played');
    });

    SOCKET.on('gameEnd', (data) => {
        game.endGame(data.message);
        SOCKET.leave(data.room);
    });

    SOCKET.on('err', (data) => {
        game.endGame(data.message);
    });
}());
