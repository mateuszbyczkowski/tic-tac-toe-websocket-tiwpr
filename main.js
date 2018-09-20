(function init() {
    const P1 = 'X';
    const P2 = 'O';
    let player;
    let game;
    var board;
    var boardContext;
    var squares = [];
    var score;
    var moves;
    var wins;
    var gridThickness = 5; // Useful constant for measuring things out.

    const socket = io.connect('http://localhost:5000');

    class Player {
        constructor(name, type) {
            this.name = name;
            this.type = type;
            this.currentTurn = true;
        }

        // Set the currentTurn for player to turn and update UI to reflect the same.
        setCurrentTurn(turn) {
            this.currentTurn = turn;
            const message = turn ? 'Your turn' : 'Waiting for Opponent';
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

    // roomId Id of the room in which the game is running on the server.
    class Game {
        constructor(roomId) {
            this.roomId = roomId;
            score = {'X': 0, 'O': 0};
            moves = 0;
            wins = [7, 56, 448, 73, 146, 292, 273, 84];
        }

        createGameBoard() {
            board = document.createElement('canvas');
            board.innerHTML = "This case study requires a web browser that supports the canvas tag.";
            board.width = 175;
            board.height = 175;
            board.onclick = set;//enable onclick canvas
            boardContext = board.getContext("2d");

            //Set whole square array with powers of 2 (beginning with 1) and set their coordinates
            var indicator = 1;
            var y = 0;
            for (var i = 0; i < 3; i += 1) {
                var x = 0;
                for (var j = 0; j < 3; j += 1) {
                    squares.push({x: x, y: y, indicator: indicator});
                    indicator += indicator;
                    x += board.width / 3;
                }
                y += board.height / 3;
            }
            document.getElementById('tic-tac-toe').appendChild(board);

            for (var i = 0; i < squares.length; i += 1) {
                squares[i].paint = squarePainters['\xA0'];
            }

            drawTicTacToeBoard();
        }

        // Remove the menu from DOM, display the gameboard and greet the player.
        displayBoard(message) {
            $('.menu').css('display', 'none');
            $('.gameBoard').css('display', 'block');
            $('#userHello').html(message);
            this.createGameBoard();
        }

        getRoomId() {
            return this.roomId;
        }

        // Announce the winner if the current client has won.
        // Broadcast this on the room to let the opponent know.
        announceWinner() {
            const message = `${player.getPlayerName()} wins!`;
            socket.emit('gameEnded', {
                room: this.getRoomId(),
                message,
            });
            alert(message);
            location.reload();
        }

        // End the game if the other player won.
        endGame(message) {
            alert(message);
            location.reload();
        }
    }

    /**
     *  BEGIN HELPERS
     */
    var set = function (event) {
        // Start with our cross-browser coordinate finder.
        if (!player.getCurrentTurn() || !game) {
            alert('Its not your turn!');
            return;
        }

        var location = getCursorPosition(event);
        var square = getSquare(location.x, location.y);
        if (square) {
            if (square.paint !== squarePainters['\xA0']) {
                return;
            }
            // Animate the incoming mark.
            animate(square);
        }
    };

    var finishTurn = function (square) {
        // Update the state of the application.
        square.paint = squarePainters[player.getPlayerType()];
        moves += 1;

        // Refresh the display.
        drawTicTacToeBoard();

        // Check for a win.
        score[player.getPlayerType()] += square.indicator;
        if (win(score[player.getPlayerType()])) {
            alert(player.getPlayerType() + " wins!");
            game.announceWinner();
        } else if (moves === 9) {
            alert("TIE!");
            socket.emit('gameEnded', {
                room: game.getRoomId(),
                message: 'Game tied!',
            });
        }

        socket.emit('playTurn', {
            squares: squares,
            score: score,
            room: game.getRoomId(),
            paints: squares.map(square => square.paint.name)
        });

        player.setCurrentTurn(false);
        console.log('Turn played score: ' + this.score);
        // Restore the click handler.
        board.onclick = set;
    };

    var win = function (score) {
        for (var i = 0; i < wins.length; i += 1) {
            if ((wins[i] & score) === wins[i]) {
                return true;
            }
        }
        return false;
    };

    /*
        * Animates the given square using the symbol of the current turn.
        */
    var animate = function (square) {
        squarePainters['\xA0'](square.x, square.y);
        boardContext.save();
        squarePainters[player.getPlayerType()](square.x, square.y);
        boardContext.restore();
        finishTurn(square);
    };

    var squarePainters = {
        '\xA0': function (x, y) {
            // Empty squares just clear the rectangle.  If desired, this can
            // be a little more elaborate, such as painting a backdrop.
            boardContext.clearRect(x + gridThickness, y + gridThickness,
                (board.width / 3) - (gridThickness << 1),
                (board.height / 3) - (gridThickness << 1));
        },

        'X': function (x, y) {
            // X's are dark blue diagonals with drop shadows.
            boardContext.save();
            boardContext.lineWidth = 5;
            boardContext.strokeStyle = "rgb(0, 0, 120)";
            boardContext.shadowOffsetX = 0;
            boardContext.shadowOffsetY = 1;
            boardContext.shadowBlur = 3;
            boardContext.shadowColor = "rgba(0, 0, 0, 0.75)";

            // We draw within a region whose margin is the grid thickness.
            var cellWidth = board.width / 3 - (gridThickness << 1),
                cellHeight = board.height / 3 - (gridThickness << 1),
                side = Math.min(cellWidth, cellHeight),
                xCorner = side >> 2,
                xSize = side * 3 >> 2;

            // The translate call helps to simplify the path coordinates.
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
            // O's are stroked arcs with a little accent in the middle.
            boardContext.save();
            boardContext.lineWidth = 4;
            boardContext.strokeStyle = "rgb(0, 120, 0)";
            boardContext.shadowOffsetX = 0;
            boardContext.shadowOffsetY = 1;
            boardContext.shadowBlur = 3;
            boardContext.shadowColor = "rgba(0, 0, 0, 0.75)";

            // We draw within a region whose margin is the grid thickness.
            var cellWidth = board.width / 3 - (gridThickness << 1),
                cellHeight = board.height / 3 - (gridThickness << 1),
                radius = Math.min(cellWidth, cellHeight) * 3 >> 3;

            // The translate call helps to simplify the path coordinates.
            boardContext.translate(x + gridThickness + (cellWidth >> 1),
                y + gridThickness + (cellHeight >> 1));
            boardContext.beginPath();
            boardContext.arc(0, 0, radius, 0, 2 * Math.PI, false);
            boardContext.stroke();

            // Put a little accent; no shadow on this one.
            boardContext.shadowColor = "rgba(0, 0, 0, 0)";
            boardContext.beginPath();
            boardContext.arc(0, 0, radius - gridThickness - 1, 0, 2 * Math.PI, false);
            boardContext.fill();

            boardContext.restore();
        }
    };

    var drawTicTacToeBoard = function () {
        boardContext.clearRect(0, 0, board.width, board.height);
        drawTicTacToeGrid();
        drawSquares();
    };

    var drawTicTacToeGrid = function () {
        boardContext.save();
        boardContext.shadowOffsetX = 1;
        boardContext.shadowOffsetY = 1;
        boardContext.shadowBlur = 3;
        boardContext.shadowColor = "rgba(0, 0, 0, 0.25)";
        boardContext.lineWidth = gridThickness;
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

    var drawSquares = function () {
        for (var i = 0; i < squares.length; i += 1) {
            squares[i].paint(squares[i].x, squares[i].y);
        }
    };

    var drawGridLine = function () {
        boardContext.save();

        var gridGradient = boardContext.createLinearGradient(0, 0, boardContext.lineWidth - 1, 0);
        gridGradient.addColorStop(0.0, "brown");
        gridGradient.addColorStop(1.0, "black");
        boardContext.strokeStyle = gridGradient;

        boardContext.beginPath();
        boardContext.moveTo(0, boardContext.lineWidth);
        boardContext.lineTo(0, board.height - boardContext.lineWidth);
        boardContext.stroke();

        boardContext.restore();
    };

    var getSquare = function (x, y) {
        var cellWidth = board.width / 3;
        var cellHeight = board.height / 3;
        for (var i = 0; i < squares.length; i += 1) {
            if ((x > squares[i].x) && (x < squares[i].x + cellWidth) &&
                (y > squares[i].y) && (y < squares[i].y + cellHeight)) {
                return squares[i];
            }
        }
        return null;
    };

    var getCursorPosition = function (event) {
        var x, y;
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
     *  END HELPERS
     */

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
        socket.emit('createGame', {name});
        console.log('Game created' + name);
        player = new Player(name, P1);
    });

    // Join an existing game on the entered roomId. Emit the joinGame event.
    $('#join').on('click', () => {
        const name = $('#nameJoin').val();
        const roomID = $('#room').val();
        if (!name || !roomID) {
            alert('Please enter your name and game ID.');
            return;
        }
        socket.emit('joinGame', {name, room: roomID});
        console.log('Player ' + name + ' joined the room');
        player = new Player(name, P2);
    });

    // New Game created by current client. Update the UI and create new Game var.
    socket.on('newGame', (data) => {
        const message =
            `Hello, ${data.name}. Please ask your friend to enter Game ID: 
      ${data.room}. Waiting for player 2...`;

        // Create game for player 1
        game = new Game(data.room);
        game.displayBoard(message);

        console.log('Newa gameroom created ' + data.room);
    });

    /**
     * If player creates the game, he'll be P1(X) and has the first turn.
     * This event is received when opponent connects to the room.
     */
    socket.on('player1', (data) => {
        const message = `Hello, ${player.getPlayerName()}`;
        $('#userHello').html(message);
        player.setCurrentTurn(true);
    });

    /**
     * Joined the game, so player is P2(O).
     * This event is received when P2 successfully joins the game room.
     */
    socket.on('player2', (data) => {
        const message = `Hello, ${data.name}`;

        // Create game for player 2
        game = new Game(data.room);
        game.displayBoard(message);
        player.setCurrentTurn(false);
    });

    /**
     * Opponent played his turn. Update UI.
     * Allow the current player to play now.
     */
    socket.on('turnPlayed', (data) => {
        squares = data.squares;
        score = data.score;
        let paints = data.paints;

        for (let i = 0; i < squares.length; i++) {
            squares[i].paint = squarePainters[paints[i]];
        }

        drawTicTacToeBoard();
        player.setCurrentTurn(true);

        console.log('Turn played');
    });

    // If the other player wins, this event is received. Notify user game has ended.
    socket.on('gameEnd', (data) => {
        game.endGame(data.message);
        socket.leave(data.room);

        console.log('Game ended' + data.message);
    });

    socket.on('err', (data) => {
        game.endGame(data.message);
    });
    /**
     *  END SOCKET EVENTS
     */
}());
