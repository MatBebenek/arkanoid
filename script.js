
//canvas
var canvasWidth = 600;
var canvasHeight = 600;
var canvasName = "canvas";

//paddle
var paddleImg = "paddle.jpg"
var paddleDefaultSpeed = 3;
var paddleNotMoving = 0;
var defaultPaddleWidth = 120;

//ball
var ballDefaultSpeed = 2;
var ballRadius = 8;

//target
var secondsToRenewTarget = 5;
var milisecondsToAddLine = 20000;
var wasMoved = false;
var targetWidth = 40;
var targetHeight = 20;
var defaultTargetShiftX = 55;
var defaultTargetShiftY = 35;

//game
var leftKeyCode = '37';
var rightKeyCode = '39';
var paddle;
var gameStarted = false;
var gameStopped = false;
var gameScore = 0;
var gameMode;
var targets = [];
var nick;
var startGameTime;
var endGameTime;
var elapsedGameTime;
var playerId = 0;
var gameModeOneTimeOutInMs = 5000;
var gameModeTwoTimeOutInMs = 15000;
var db;
var bonusOpacity = 0.7;
var bonusFallSpeed = 1;
var bonusHandlers = [];
var bonusLabels = [];
var bonusPaddleIncrease = 1.5;
var bonusPaddleShrink = 0.7;
var isControlReversed = false;
var bonuses = [];
var bonusChance = 0.2;
var newBallSpawnRate = 5;
var tillNewBallCounter = 0;
var aTobTypeBlocks = 0.5;
var balls = [];
var ballColors = ["red", "green", "blue", "orange"];
var ballSpawnAreaYmin = 100;
var ballSpawnAreaYmax = 150;
var labelColor = "white";
var defaultPointsPerBlock = 1;
var currentPointsPerBlock = defaultPointsPerBlock;

function initDb() {
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB ||
        window.msIndexedDB;

    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction ||
        window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange ||
        window.webkitIDBKeyRange || window.msIDBKeyRange

    if (!window.indexedDB) {
        window.alert("Your browser doesn't support a stable version of IndexedDB.")
    }

    var request = window.indexedDB.open("newDatabase", 1);

    request.onerror = function (event) {
        console.log("error: ");
    };

    request.onsuccess = function (event) {
        db = request.result;
        console.log("success: " + db);
    };

    request.onupgradeneeded = function (event) {
        var db = event.target.result;
        var objectStore = db.createObjectStore("games", { keyPath: "id" });
    };
}

initDb();

function startGame() {
    readAll();
    if (!gameStarted) {
        gameMode = prompt("Select game mode. 1 - Infinite spawns, 2 - Slide");
        switch (gameMode) {
            case '1':
                gameMode = 1;
                break;
            case '2':
                gameMode = 2;
                break;
            default:
                alert("Incorrect game mode.");
                break;
        }
        if (gameMode == 1 || gameMode == 2) {
            let person = prompt("Please enter your name:", "Your Name");
            if (person == null || person == "") {
                alert("User cancelled the prompt or entered wrong name");
            } else {
                startGameTime = performance.now();
                nick = person;
                paddle = new paddleBuilder(defaultPaddleWidth, 15, 260, 580);
                firstBall = new ballBuilder(ballRadius, "red", paddle.x + 100, paddle.y - paddle.height);
                balls.push(firstBall);
                initBonuses();
                targets = generateTargetLocations();
                myGameArea.start();
                gameStarted = true;
            }
        }
    } else {
        gameStarted = false;
        gameStopped = false;
        changeToResume();
        newGame();
    }
}

function stopGame() {
    if (gameStarted) {
        if (gameStopped) {
            myGameArea.interval = setInterval(updateGameArea, 10);
            if (gameMode == 2) {
                myGameArea.newLineInterval = setInterval(addNewLine, milisecondsToAddLine);
            }
            gameStopped = false;
        } else {
            clearInterval(myGameArea.interval);
            clearInterval(myGameArea.newLineInterval);
            gameStopped = true;
        }
    }
}

function newGame() {
    if (!gameStopped) {
        gameScore = 0;
        clearInterval(myGameArea.interval);
        startGame();
    }
}

var myGameArea = {
    canvas: document.createElement(canvasName),
    start: function () {
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.context = this.canvas.getContext("2d");
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.interval = setInterval(updateGameArea, 10);
        if (gameMode == 2) {
            this.newLineInterval = setInterval(addNewLine, milisecondsToAddLine);
        }
    },
    clear: function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

function paddleBuilder(width, height, x, y) {
    var img = new Image();
    img.src = paddleImg;
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;
    this.x = x;
    this.y = y;
    this.update = function () {
        checkBonusToPaddleCollision();
        ctx = myGameArea.context;
        var pat = ctx.createPattern(img, "repeat");
        ctx.fillStyle = pat;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    this.newPos = function () {
        this.x += this.speedX;
        if (this.x < 0) {
            this.x = 0;
            clearmove();
        }
        if (this.x > myGameArea.canvas.width - this.width) {
            this.x = myGameArea.canvas.width - this.width;
            clearmove();
        }
        this.y += this.speedY;
    }
}

function bonusBuilder(width, height, x, y) {
    var img = new Image();
    img.src = "target.jpg";
    this.width = width;
    this.height = height;
    this.speedY = bonusFallSpeed;
    this.x = x;
    this.y = y;
    let selection = Math.floor(Math.random() * bonusHandlers.length);
    this.action = bonusHandlers[selection];
    this.label = bonusLabels[selection];
    this.update = function () {
        ctx = myGameArea.canvas.getContext("2d");
        var pat = ctx.createPattern(img, "repeat");
        ctx.font = "12px Arial";
        ctx.fillStyle = pat;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillText(this.label, this.x, this.y + 13);
    }
    this.newPos = function () {
        this.y += this.speedY;
    }
}

function targetBuilder(width, height, x, y) {
    var img = new Image();
    img.src = "target.jpg";
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;
    this.x = x;
    this.y = y;
    this.visible = true;
    this.timeInvisible = 0;
    this.isSpecialBlock = false;
    if (Math.random() > aTobTypeBlocks) this.isSpecialBlock = true;
    this.update = function () {
        this.setCorners();
        ctx = myGameArea.context;
        var pat = ctx.createPattern(img, "repeat");
        if (this.visible) {
            ctx.fillStyle = pat;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        if (gameMode == 1 && (((performance.now() - this.timeInvisible) / 1000) >= secondsToRenewTarget)) {
            this.visible = true;
            this.timeInvisible = 0;
        }
    }
    this.moveTargetDown = function () {
        this.y = this.y + defaultTargetShiftY;
        this.update();
    }
    this.setCorners = function () {
        this.bottomLeft = [this.x, this.y]
        this.bottomRight = [this.x + this.width, this.y]
        this.topRight = [this.x + this.width, this.y + this.height]
        this.topLeft = [this.x, this.y + this.height]
    }
}

function ballBuilder(ballRadius, color, x, y) {
    this.ballRadius = ballRadius;
    this.speedX = ballDefaultSpeed;
    this.speedY = ballDefaultSpeed;
    this.x = x;
    this.y = y + this.ballRadius;
    this.dx = 2;
    this.dy = -2;
    this.update = function () {
        ctx = myGameArea.context;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
    this.newPos = function () {
        targets.forEach(element => {
            if
                (
                (element.visible) &&
                (this.x > element.bottomLeft[0] && this.x < element.bottomRight[0]) &&
                ((this.y + this.ballRadius) > element.bottomLeft[1] && this.y < element.topLeft[1])
            ) {
                gameScore += currentPointsPerBlock;
                applySpecialBlockLogic(element);
                element.visible = false;
                this.speedY = -this.speedY;
                if (gameMode == 1) {
                    element.timeInvisible = performance.now();
                }
            }
        });
        if (this.x + this.dx > myGameArea.canvas.width - this.ballRadius || this.x + this.dx < this.ballRadius) {
            this.speedX = -this.speedX;
        }
        if (this.y + this.dy < this.ballRadius) {
            this.speedY = -this.speedY;
        } else if (this.y + this.dy > myGameArea.canvas.height - this.ballRadius - paddle.height) {
            if (this.x > paddle.x && this.x < paddle.x + paddle.width) {
                var c = calculateBallSpeed(this, paddle);
                if (this.speedX < 0) {
                    this.speedX = -ballDefaultSpeed * c;
                } else {
                    this.speedX = ballDefaultSpeed * c;
                }
                this.speedY = -this.speedY;
            }
            else {
                if (this.y + this.dy > myGameArea.canvas.height - this.ballRadius) {
                    if (balls.length == 1) {
                        elapsedGameTime = getElapsedGameTime().toFixed(2);
                        alert("GAME OVER!! You were playing " + elapsedGameTime + " seconds!");
                        addToDatabase();
                        document.location.reload();
                        clearInterval(myGameArea.interval);
                        clearInterval(myGameArea.newLineInterval);
                    } else {
                        balls = arrayRemove(balls, this);
                    }
                }
            }
        }

        this.x += this.speedX;
        this.y -= this.speedY;
    }
}

function arrayRemove(arr, value) {

    return arr.filter(function (ele) {
        return ele != value;
    });
}

function getElapsedGameTime() {
    timeDiff = performance.now() - startGameTime;
    timeDiff /= 1000;
    return timeDiff;
}

function addNewLine() {
    targets.forEach(element => element.moveTargetDown())
    shiftX = 0;
    for (var x = 0; x < 10; x++) {
        targets.push(new targetBuilder(40, 20, 40 + shiftX, 40));
        shiftX += 55;
    }
}

function moveleft() {
    if (isControlReversed) {
        paddle.speedX = paddleDefaultSpeed;
    } else {
        paddle.speedX = -paddleDefaultSpeed;
    }
}

function moveright() {
    if (isControlReversed) {
        paddle.speedX = -paddleDefaultSpeed;
    } else {
        paddle.speedX = paddleDefaultSpeed;
    }
}

function applySpecialBlockLogic(target) {
    if (target.isSpecialBlock == true && Math.random() < bonusChance) {
        bonuses.push(new bonusBuilder(target.width, target.height, target.x, target.y));
    } else {
        tillNewBallCounter++;
        if (tillNewBallCounter > newBallSpawnRate) {
            tillNewBallCounter = 0;
            balls.push(generateNewBall());
        }
    }
}

function checkBonusToPaddleCollision() {
    bonuses.forEach(bonus => {
        if (bonus.x + bonus.width > paddle.x
            && bonus.x < paddle.x + paddle.width
            && bonus.y + bonus.height > paddle.y
            && bonus.y < paddle.y + paddle.height) {
            bonus.action();
            bonus.toRemove = true;

        }
    });
    bonuses = bonuses.filter(bonus => !bonus.toRemove);
}

function clearmove() {
    paddle.speedX = paddleNotMoving;
    paddle.speedY = paddleNotMoving;
}

document.onkeydown = checkkey;
document.onkeyup = clearmove;

function checkkey(e) {
    if (e.keyCode == leftKeyCode) {
        moveleft();
    } else if (e.keyCode == rightKeyCode) {
        moveright();
    }
}

function changeNewGame() {
    var btn = document.getElementById("startButton");
    btn.innerHTML = 'NEW GAME';
}

function changeToResume() {
    var btn = document.getElementById("stopButton");
    if (btn.innerHTML == "STOP" && gameStarted) {
        btn.innerHTML = "RESUME";
    } else {
        btn.innerHTML = "STOP";
    }
}

function generateTargetLocations() {
    shiftX = 0;
    shiftY = 0;
    for (var y = 0; y < 3; y++) {
        for (var x = 0; x < 10; x++) {
            element = new targetBuilder(targetWidth, targetHeight, 40 + shiftX, 40 + shiftY);
            targets.push(element);
            shiftX += defaultTargetShiftX;
        }
        shiftX = 0;
        shiftY += defaultTargetShiftY;
    }
    return targets;
}

function addToDatabase() {
    var request = db.transaction(["games"], "readwrite")
        .objectStore("games")
        .add({ id: playerId, nick: nick, score: gameScore, time: elapsedGameTime });

    request.onsuccess = function (event) {
        alert("Game has been added to database.");
    };

    request.onerror = function (event) {
        alert("Unable to add data!");
    }
}

function readAll() {
    var objectStore = db.transaction("games").objectStore("games");
    document.getElementById("previousGames").innerHTML = "Score Board:<br>";

    objectStore.openCursor().onsuccess = function (event) {
        var cursor = event.target.result;

        if (cursor) {
            document.getElementById("previousGames").innerHTML += "Id: " + cursor.key + " Nick: " + cursor.value.nick + " Score: " + cursor.value.score + " Time: " + cursor.value.time + " sec <br />";
            playerId = cursor.key;
            cursor.continue();
        } else {
            playerId += 1;
        }
    };
}

function calculateBallSpeed(ball, paddle) {
    var c = 0;
    var g = ((ball.x - paddle.x) / (paddle.width));
    if (g <= 0.1) c = 3;
    if (g > 0.1 && g <= 0.3) c = 2;
    if (g > 0.3 && g <= 0.4) c = 1.5;
    if (g > 0.4 && g <= 0.6) c = 1;
    if (g > 0.6 && g <= 0.7) c = 1.5;
    if (g > 0.7 && g <= 0.9) c = 2;
    if (g > 0.9) c = 3;

    return c;
}

function bonusResizePaddle() {
    paddle.width = paddle.width * bonusPaddleIncrease;
    window.setTimeout(() => { paddle.width = defaultPaddleWidth }, 5000);
}

function bonusShrinkPaddle() {
    paddle.width = paddle.width * bonusPaddleShrink;
    window.setTimeout(() => { paddle.width = defaultPaddleWidth }, 5000);
}

function bonusPointsTimesTwo() {
    currentPointsPerBlock = 2;
    window.setTimeout(() => { currentPointsPerBlock = defaultPointsPerBlock }, 5000);
}

function bonusPointsTimesFive() {
    currentPointsPerBlock = 5;
    window.setTimeout(() => { currentPointsPerBlock = defaultPointsPerBlock }, 5000);
}

function bonusReverseControl() {
    isControlReversed = true;
    window.setTimeout(() => { isControlReversed = false }, 5000);
}

function initBonuses() {
    bonusHandlers.push(() => { bonusResizePaddle() });
    bonusHandlers.push(() => { bonusPointsTimesTwo() });
    bonusHandlers.push(() => { bonusPointsTimesFive() });
    bonusHandlers.push(() => { bonusShrinkPaddle() });
    bonusHandlers.push(() => { bonusReverseControl() });

    bonusLabels.push("IncSize");
    bonusLabels.push("Pts x 2");
    bonusLabels.push("Pts x 5");
    bonusLabels.push("DecSize");
    bonusLabels.push("Reverse");
}

function generateNewBall() {
    var ball = new ballBuilder(
        ballRadius,
        ballColors[Math.floor(Math.random() * ballColors.length)],
        Math.random() * canvasWidth,
        ballSpawnAreaYmin + Math.random() * (ballSpawnAreaYmax - ballSpawnAreaYmin)
    );
    return ball;
}

function updateGameArea() {
    document.getElementById("currentGame").innerHTML = "Good luck " + nick + "! Your score is " + gameScore + " !";
    myGameArea.clear();
    targets.forEach(element => element.update());
    paddle.newPos();
    balls.forEach(one => one.newPos());
    bonuses.forEach(x => x.newPos());
    paddle.update();
    balls.forEach(one => one.update());
    bonuses.forEach(x => x.update());
}